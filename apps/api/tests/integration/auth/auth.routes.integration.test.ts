import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import { resetAndSeedDatabase } from "../../../database/resetAndSeed";
import app from "../../../src/app";
import { APP_ROLES } from "../../../src/auth/appRole";
import { verifyAccessToken } from "../../../src/auth/jwt";
import { hashPassword } from "../../../src/auth/password";
import { clearLoginRateLimit } from "../../../src/middlewares/loginRateLimit";

const email = "admin@lucarne.test";
const password = "a-secure-password";
const invalidCredentialsResponse = {
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
  },
};

let userId: string;

beforeEach(async () => {
  clearLoginRateLimit();
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  const role = await prisma.role.create({
    data: {
      name: APP_ROLES.ADMIN,
    },
  });
  const user = await prisma.appUser.create({
    data: {
      email,
      firstName: "Test",
      lastName: "Admin",
      passwordHash: await hashPassword(password),
      roleId: role.id,
      status: "ACTIVE",
    },
  });

  userId = user.id;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/v1/auth/login", () => {
  it("loads seasons with a fresh login after reset and rejects the previous session", async () => {
    const previousLogin = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);
    const previousToken = (previousLogin.body as { accessToken: string }).accessToken;
    vi.stubEnv("DEMO_ADMIN_PASSWORD", password);
    await resetAndSeedDatabase(prisma);

    const freshLogin = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);
    const freshToken = (freshLogin.body as { accessToken: string }).accessToken;
    expect((await verifyAccessToken(freshToken)).sub).not.toBe(userId);
    await request(app).get("/api/v1/seasons").set("Authorization", `Bearer ${previousToken}`).expect(401);
    const seasons = await request(app).get("/api/v1/seasons").set("Authorization", `Bearer ${freshToken}`).expect(200);
    expect(seasons.body).toMatchObject({ data: [], pagination: { totalItems: 0 } });
  });
  it("returns an access token for valid credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: expect.any(String) as string,
    });

    const payload = await verifyAccessToken(
      (response.body as { accessToken: string }).accessToken,
    );

    expect(payload).toEqual({
      sub: userId,
      role: APP_ROLES.ADMIN,
    });
  });

  it("returns the generic error for an unknown email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "unknown@lucarne.test", password });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(invalidCredentialsResponse);
  });

  it("returns the same generic error for an incorrect password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "incorrect-password" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(invalidCredentialsResponse);
  });

  it("rejects an invalid payload", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "invalid", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
      },
    });
  });

  it("rejects a disabled user", async () => {
    await prisma.appUser.update({
      where: { id: userId },
      data: { status: "DISABLED" },
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "ACCOUNT_NOT_ACTIVE",
        message: "User account is not active",
      },
    });
  });
});
