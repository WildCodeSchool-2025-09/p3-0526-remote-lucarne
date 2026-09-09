import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { APP_ROLES } from "../auth/appRole";
import type { AppRole } from "../auth/appRole";
import { errorHandler } from "./errorHandler";
import { DELETE_ROLES, requireRoles, WRITE_ROLES } from "./requireRoles";

const createTestApp = (
  userRole: AppRole | undefined,
  allowedRoles: AppRole[],
) => {
  const app = express();

  app.use((request, _response, next) => {
    if (userRole != null) {
      request.user = { id: "user-id", role: userRole };
    }
    next();
  });
  app.get("/protected", requireRoles(...allowedRoles), (_request, response) => {
    response.sendStatus(204);
  });
  app.use(errorHandler);

  return app;
};

describe("requireRoles", () => {
  it("returns 401 when no user is authenticated", async () => {
    const response = await request(createTestApp(undefined, WRITE_ROLES))
      .get("/protected");

    expect(response.status).toBe(401);
  });

  it.each([
    ["ADMIN", APP_ROLES.ADMIN, 204],
    ["MODERATOR", APP_ROLES.MODERATOR, 204],
    ["EDITOR", APP_ROLES.EDITOR, 204],
    ["USER", APP_ROLES.USER, 403],
  ] as const)("applies WRITE_ROLES to %s", async (_role, role, status) => {
    const response = await request(createTestApp(role, WRITE_ROLES))
      .get("/protected");

    expect(response.status).toBe(status);
  });

  it.each([
    ["ADMIN", APP_ROLES.ADMIN, 204],
    ["MODERATOR", APP_ROLES.MODERATOR, 204],
    ["EDITOR", APP_ROLES.EDITOR, 403],
    ["USER", APP_ROLES.USER, 403],
  ] as const)("applies DELETE_ROLES to %s", async (_role, role, status) => {
    const response = await request(createTestApp(role, DELETE_ROLES))
      .get("/protected");

    expect(response.status).toBe(status);
  });
});
