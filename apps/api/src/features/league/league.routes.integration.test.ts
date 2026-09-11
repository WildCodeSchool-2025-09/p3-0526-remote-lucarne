import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../app";
import {
  createAdmin,
  createEditor,
  createModerator,
  createUser,
} from "../../test/helpers/auth";

const payload = {
  name: "Division 1",
  country: "France",
};

const authenticatedUsers = [
  ["ADMIN", createAdmin, 201],
  ["MODERATOR", createModerator, 403],
  ["EDITOR", createEditor, 403],
  ["USER", createUser, 403],
] as const;

describe("POST /api/v1/leagues", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(authenticatedUsers)("applies access rules to %s", async (
    _role,
    createUserForTest,
    expectedStatus,
  ) => {
    const user = await createUserForTest();

    const response = await request(app)
      .post("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(expectedStatus);
  });

  it("returns 401 for an anonymous request", async () => {
    const response = await request(app)
      .post("/api/v1/leagues")
      .send(payload);

    expect(response.status).toBe(401);
  });

  it("creates no related resources when authorized", async () => {
    const user = await createAdmin();

    const response = await request(app)
      .post("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    await expect(prisma.league.count()).resolves.toBe(1);
    await expect(prisma.season.count()).resolves.toBe(0);
  });

  it.each([
    [{ country: "France" }, "name absent"],
    [{ name: "", country: "France" }, "name empty"],
    [{ name: "a".repeat(151), country: "France" }, "name too long"],
    [{ name: "Division 1" }, "country absent"],
    [{ name: "Division 1", country: "" }, "country empty"],
    [{ name: "Division 1", country: "a".repeat(101) }, "country too long"],
    [{ name: "Division 1", country: "France", logoUrl: "invalid" }, "logoUrl invalid"],
    [{ name: "Division 1", country: "France", isActive: "true" }, "isActive invalid"],
  ])("rejects %s", async (invalidPayload, _description) => {
    void _description;
    const user = await createAdmin();

    const response = await request(app)
      .post("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(invalidPayload);

    expect(response.status).toBe(400);
  });

  it("supports minimal creation and defaults isActive to false", async () => {
    const user = await createAdmin();

    const response = await request(app)
      .post("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: false,
    });
  });

  it("supports complete creation and isActive=false", async () => {
    const user = await createAdmin();

    const response = await request(app)
      .post("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        name: "Division 2",
        country: "France",
        logoUrl: "https://example.com/division-2.png",
        isActive: false,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Division 2",
      country: "France",
      logoUrl: "https://example.com/division-2.png",
      isActive: false,
    });
  });

  it("returns 409 for a duplicate name and country", async () => {
    const user = await createAdmin();
    const createRequest = () => request(app)
      .post("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`);

    await createRequest().send(payload).expect(201);
    const response = await createRequest().send(payload);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "RESOURCE_ALREADY_EXISTS",
        message: "Resource already exists",
      },
    });
  });

  it("allows the same name for a different country", async () => {
    const user = await createAdmin();
    const createRequest = () => request(app)
      .post("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`);

    await createRequest().send(payload).expect(201);
    const response = await createRequest().send({
      name: payload.name,
      country: "Belgium",
    });

    expect(response.status).toBe(201);
    await expect(prisma.league.count()).resolves.toBe(2);
  });
});
