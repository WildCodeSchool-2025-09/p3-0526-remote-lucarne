import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { clearLoginRateLimit, createLoginRateLimiter, loginRateLimit } from "../../../src/middlewares/loginRateLimit";
import { errorHandler } from "../../../src/middlewares/errorHandler";

describe("loginRateLimit", () => {
  afterEach(clearLoginRateLimit);

  function fixture(maxKeys = 2, maxAttempts = 2) {
    let time = 0;
    const limiter = createLoginRateLimiter({ maxAttempts, windowMs: 10_000, maxKeys, now: () => time });
    const app = express();
    app.use(express.json());
    app.post("/login", limiter.middleware, (_request, response) => { response.sendStatus(204); });
    app.use(errorHandler);
    return {
      attempt: (email: string) => request(app).post("/login").send({ email }),
      advance: (milliseconds: number) => { time += milliseconds; },
    };
  }

  it("normalizes email keys and resets attempts exactly when the window expires", async () => {
    const { attempt, advance } = fixture();
    await attempt(" User@lucarne.test ").expect(204);
    await attempt("user@lucarne.test").expect(204);
    advance(9_001);
    const blocked = await attempt("USER@lucarne.test").expect(429);
    expect(blocked.headers["retry-after"]).toBe("1");
    advance(999);
    await attempt("user@lucarne.test").expect(204);
  });

  it("evicts expired keys to admit new logins without dropping live counters", async () => {
    const { attempt, advance } = fixture();
    await attempt("first@lucarne.test").expect(204);
    advance(5_000);
    await attempt("second@lucarne.test").expect(204);
    await attempt("third@lucarne.test").expect(429);
    advance(5_000);
    await attempt("third@lucarne.test").expect(204);
    await attempt("second@lucarne.test").expect(204);
    await attempt("second@lucarne.test").expect(429);
  });

  it("refuses admission at capacity so key flooding cannot reset a blocked login", async () => {
    const { attempt } = fixture(2, 1);
    await attempt("blocked@lucarne.test").expect(204);
    await attempt("other@lucarne.test").expect(204);
    for (let index = 0; index < 5; index++) {
      await attempt(`new-${index}@lucarne.test`).expect(429);
      await attempt("blocked@lucarne.test").expect(429);
    }
  });

  it("keeps oversized invalid emails from escaping the same attempt counter", async () => {
    const { attempt } = fixture(1, 1);
    const email = "a".repeat(20_000);
    await attempt(email).expect(204);
    await attempt(email).expect(429);
    await attempt("different@lucarne.test").expect(429);
  });

  it("preserves explicit disabling of the limiter", async () => {
    const { attempt } = fixture(1, 0);
    for (let index = 0; index < 4; index++) await attempt(`user-${index}@lucarne.test`).expect(204);
  });

  it("returns 429 with a retry delay after the configured attempt limit", async () => {
    const app = express();
    app.use(express.json());
    app.post("/login", loginRateLimit, (_request, response) => { response.sendStatus(204); });
    app.use(errorHandler);
    for (let index = 0; index < 5; index += 1) {
      await request(app).post("/login").send({ email: "user@lucarne.test" }).expect(204);
    }
    const response = await request(app).post("/login").send({ email: "user@lucarne.test" });
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBeDefined();
    expect((response.body as { error: { code: string } }).error.code).toBe("TOO_MANY_LOGIN_ATTEMPTS");
  });
});
