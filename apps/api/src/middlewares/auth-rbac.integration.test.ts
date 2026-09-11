import express from "express";
import { SignJWT } from "jose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { environment } from "../config/environment";
import { authenticate } from "./authenticate";
import { errorHandler } from "./errorHandler";
import { DELETE_ROLES, requireRoles, WRITE_ROLES } from "./requireRoles";
import {
  createAdmin,
  createEditor,
  createModerator,
  createUser,
} from "../test/helpers/auth";

const testApp = express();
testApp.get("/auth-only", authenticate, (_request, response) => {
  response.sendStatus(204);
});
testApp.get(
  "/write",
  authenticate,
  requireRoles(...WRITE_ROLES),
  (_request, response) => {
    response.sendStatus(204);
  },
);
testApp.get(
  "/delete",
  authenticate,
  requireRoles(...DELETE_ROLES),
  (_request, response) => {
    response.sendStatus(204);
  },
);
testApp.use(errorHandler);

const createExpiredToken = async (userId: string, role: string) =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(environment.appSecret));

const authUsers = [
  ["ADMIN", createAdmin],
  ["MODERATOR", createModerator],
  ["EDITOR", createEditor],
  ["USER", createUser],
] as const;

describe("HTTP authentication and RBAC", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a request without a token", async () => {
    const response = await request(testApp).get("/auth-only");

    expect(response.status).toBe(401);
  });

  it("rejects a malformed Bearer header", async () => {
    const response = await request(testApp)
      .get("/auth-only")
      .set("Authorization", "Bearer");

    expect(response.status).toBe(401);
  });

  it("rejects an invalid JWT", async () => {
    const response = await request(testApp)
      .get("/auth-only")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });

  it("rejects an expired JWT", async () => {
    const user = await createAdmin();
    const token = await createExpiredToken(user.id, user.role);
    const response = await request(testApp)
      .get("/auth-only")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it("allows a valid JWT", async () => {
    const user = await createAdmin();
    const response = await request(testApp)
      .get("/auth-only")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(204);
  });

  it.each(authUsers)("applies write permissions to %s", async (
    _role,
    createUserForTest,
  ) => {
    const user = await createUserForTest();
    const response = await request(testApp)
      .get("/write")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(
      ["ADMIN", "MODERATOR", "EDITOR"].includes(user.role) ? 204 : 403,
    );
  });

  it.each(authUsers)("applies delete permissions to %s", async (
    _role,
    createUserForTest,
  ) => {
    const user = await createUserForTest();
    const response = await request(testApp)
      .get("/delete")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(
      user.role === "ADMIN" ? 204 : 403,
    );
  });
});
