import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authenticate } from "./authenticate";
import {
  createAdmin,
  createEditor,
  createModerator,
  createUser,
} from "../test/helpers/auth";
import { errorHandler } from "./errorHandler";

const testApp = express();
testApp.get("/protected", authenticate, (httpRequest, response) => {
  response.json(httpRequest.user);
});
testApp.use(errorHandler);

describe("authenticate with test auth helpers", () => {
  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
    ["USER", createUser],
  ] as const)("interprets a %s token", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const response = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      role: user.role,
    });
  });
});
