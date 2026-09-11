import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../app";
import { createAdmin, createEditor, createModerator, createUser } from "../../test/helpers/auth";

const createLeague = (name = "Division 1", country = "France", isActive = false) =>
  prisma.league.create({ data: { name, country, isActive } });

interface ErrorBody {
  error: {
    code: string;
    details?: unknown[];
  };
}

const asErrorBody = (body: unknown): ErrorBody => body as ErrorBody;

describe("PATCH /api/v1/leagues/:leagueId", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates partial business fields and increments the version", async () => {
    const user = await createEditor();
    const league = await createLeague();

    const response = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Division 1 updated", version: 0 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: league.id,
      name: "Division 1 updated",
      country: "France",
      isActive: false,
      version: 1,
      createdAt: league.createdAt.toISOString(),
    });
  });

  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("allows general edits for %s", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const league = await createLeague();

    await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ country: "Belgium", version: 0 })
      .expect(200);
  });

  it("allows only ADMIN to change isActive", async () => {
    const moderator = await createModerator();
    const league = await createLeague();

    const forbidden = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ isActive: true, version: 0 });

    expect(forbidden.status).toBe(403);
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ isActive: false, version: 0 });

    const admin = await createAdmin();
    await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ isActive: true, version: 0 })
      .expect(200);
  });

  it("returns 401 for an anonymous request and 403 for USER", async () => {
    const league = await createLeague();
    const anonymous = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .send({ name: "Updated", version: 0 });
    expect(anonymous.status).toBe(401);

    const user = await createUser();
    const forbidden = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Updated", version: 0 });
    expect(forbidden.status).toBe(403);
  });

  it.each([
    [{ version: 0 }, "no business field"],
    [{ name: "Updated" }, "missing version"],
    [{ version: "0", name: "Updated" }, "string version"],
    [{ version: 0, unknownField: true, name: "Updated" }, "unknown field"],
    [{ version: 0, id: "unexpected", name: "Updated" }, "immutable id"],
  ])("returns field-aware validation errors for %s", async (requestBody, _description) => {
    void _description;
    const user = await createAdmin();
    const league = await createLeague();

    const response = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(requestBody);

    expect(response.status).toBe(400);
    const errorBody = asErrorBody(response.body);
    expect(errorBody.error.code).toBe("VALIDATION_ERROR");
    expect(errorBody.error.details).toBeInstanceOf(Array);
  });

  it("returns 400 for an invalid leagueId", async () => {
    const user = await createAdmin();
    const response = await request(app)
      .patch("/api/v1/leagues/not-a-uuid")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Updated", version: 0 });

    expect(response.status).toBe(400);
    expect(asErrorBody(response.body).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for a missing league", async () => {
    const user = await createAdmin();
    const response = await request(app)
      .patch("/api/v1/leagues/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Updated", version: 0 });

    expect(response.status).toBe(404);
    expect(asErrorBody(response.body).error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("returns a version conflict without overwriting newer data", async () => {
    const user = await createAdmin();
    const league = await createLeague();

    await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "First update", version: 0 })
      .expect(200);

    const response = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Stale update", version: 0 });

    expect(response.status).toBe(409);
    expect(asErrorBody(response.body).error.code).toBe("RESOURCE_VERSION_CONFLICT");
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ name: "First update", version: 1 });
  });

  it("returns a duplicate conflict for the existing name and country pair", async () => {
    const user = await createAdmin();
    await createLeague("Existing League", "France");
    const league = await createLeague("Other League", "France");

    const response = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Existing League", version: 0 });

    expect(response.status).toBe(409);
    expect(asErrorBody(response.body).error.code).toBe("RESOURCE_ALREADY_EXISTS");
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ name: "Other League", version: 0 });
  });
});
