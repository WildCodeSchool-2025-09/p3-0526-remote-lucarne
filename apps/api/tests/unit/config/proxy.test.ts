import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("../../../src/router");
  vi.resetModules();
});

async function fixture(trustedIps: string, keyBy: "ip" | "ip-email" = "ip") {
  vi.stubEnv("TRUSTED_PROXY_IPS", trustedIps);
  vi.resetModules();
  const { createLoginRateLimiter } = await import("../../../src/middlewares/loginRateLimit");
  const limiter = createLoginRateLimiter({ maxAttempts: 1, windowMs: 60_000, keyBy });
  const router = express.Router();
  router.post("/proxy-test", limiter.middleware, (incoming, response) => {
    response.json({ ip: incoming.ip });
  });
  // Exercise the real app settings with a test router, without accessing Prisma.
  vi.doMock("../../../src/router", () => ({ default: router }));
  const { default: app } = await import("../../../src/app");
  return (forwardedFor: string) => request(app).post("/api/v1/proxy-test")
    .set("X-Forwarded-For", forwardedFor).send({ email: "same@example.com" });
}

describe("explicit trusted proxies", () => {
  it("ignores spoofed forwarded headers when no proxy is configured", async () => {
    const attempt = await fixture("");
    const response = await attempt("198.51.100.1").expect(200);
    expect((response.body as { ip: string }).ip).not.toBe("198.51.100.1");
    await attempt("198.51.100.2").expect(429);
  });

  it("ignores headers from an untrusted direct connection", async () => {
    const attempt = await fixture("172.30.50.2");
    await attempt("198.51.100.1").expect(200);
    await attempt("198.51.100.2").expect(429);
  });

  it.each(["ip", "ip-email"] as const)("separates clients behind a trusted proxy for %s limits", async (keyBy) => {
    const attempt = await fixture("127.0.0.1,::1", keyBy);
    const first = await attempt("198.51.100.1").expect(200);
    expect(first.body).toEqual({ ip: "198.51.100.1" });
    await attempt("198.51.100.1").expect(429);
    const second = await attempt("198.51.100.2").expect(200);
    expect(second.body).toEqual({ ip: "198.51.100.2" });
  });

  it("stops at the nearest untrusted address instead of accepting a forged prefix", async () => {
    const attempt = await fixture("127.0.0.1,::1");
    const response = await attempt("203.0.113.1, 198.51.100.1").expect(200);
    expect(response.body).toEqual({ ip: "198.51.100.1" });
    await attempt("203.0.113.2, 198.51.100.1").expect(429);
  });
});
