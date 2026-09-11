import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROLES } from "../auth/appRole";
import { errorHandler } from "./errorHandler";
import { authenticate } from "./authenticate";

const { verifyAccessToken, findUnique } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("../auth/jwt", () => ({ verifyAccessToken }));
vi.mock("../../database/prisma", () => ({ default: { appUser: { findUnique } } }));

const createTestApp = () => {
  const testApp = express();
  testApp.get("/protected", authenticate, (request, response) => {
    response.json(request.user);
  });
  testApp.use(errorHandler);
  return testApp;
};

describe("authenticate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAccessToken.mockResolvedValue({
      sub: "user-id",
      role: APP_ROLES.USER,
    });
    findUnique.mockResolvedValue({
      id: "user-id",
      status: "ACTIVE",
      role: { name: APP_ROLES.ADMIN },
    });
  });

  it.each([
    ["without an authorization header", undefined],
    ["with a malformed authorization header", "Basic token"],
  ])("rejects requests %s", async (_description, authorization) => {
    const testRequest = request(createTestApp()).get("/protected");

    if (authorization != null) {
      testRequest.set("authorization", authorization);
    }

    const response = await testRequest;

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
      },
    });
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid token", new Error("invalid token")],
    ["an expired token", new Error("expired token")],
  ])("rejects %s", async (_description, error) => {
    verifyAccessToken.mockRejectedValue(error);

    const response = await request(createTestApp())
      .get("/protected")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("attaches the minimal current user and calls next for a valid token", async () => {
    const response = await request(createTestApp())
      .get("/protected")
      .set("authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "user-id",
      role: APP_ROLES.ADMIN,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-id" },
      select: {
        id: true,
        status: true,
        role: { select: { name: true } },
      },
    });
  });

  it("rejects an account that is no longer active", async () => {
    findUnique.mockResolvedValue({
      id: "user-id",
      status: "DISABLED",
      role: { name: APP_ROLES.ADMIN },
    });

    const response = await request(createTestApp())
      .get("/protected")
      .set("authorization", "Bearer valid-token");

    expect(response.status).toBe(401);
  });
});
