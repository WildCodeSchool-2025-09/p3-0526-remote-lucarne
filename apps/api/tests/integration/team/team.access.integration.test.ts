import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import {
  createAdmin,
  createEditor,
  createModerator,
  createUser,
} from "../../helpers/auth";

const payload = { name: "Paris FC" };

describe("POST /api/v1/teams access", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("allows %s to create a team", async (_role, createUserForTest) => {
    const user = await createUserForTest();

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    await expect(prisma.team.count()).resolves.toBe(1);
  });

  it("returns 403 and creates no team for USER", async () => {
    const user = await createUser();

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(403);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns 401 and creates no team without a token", async () => {
    const response = await request(app)
      .post("/api/v1/teams")
      .send(payload);

    expect(response.status).toBe(401);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns 401 and creates no team for an invalid token", async () => {
    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", "Bearer invalid-token")
      .send(payload);

    expect(response.status).toBe(401);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns 401 and creates no team for an inactive user", async () => {
    const user = await createAdmin();

    await prisma.appUser.update({
      where: { id: user.id },
      data: { status: "DISABLED" },
    });

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(401);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("validates the body after authorization and creates no team for invalid input", async () => {
    const user = await createAdmin();

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "a".repeat(151) });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    await expect(prisma.team.count()).resolves.toBe(0);
  });
});
