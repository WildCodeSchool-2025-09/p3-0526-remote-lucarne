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

const createLeague = (isActive: boolean) => prisma.league.create({
  data: {
    name: isActive ? "Active Security League" : "Inactive Security League",
    country: "France",
    isActive,
  },
});

const errorCodeOf = (body: unknown): string => (body as { error: { code: string } }).error.code;

describe("League access security", () => {
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
  ] as const)("allows detail access for %s", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const league = await createLeague(false);

    const response = await request(app)
      .get(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: league.id, status: "INACTIVE" });
  });

  it("returns 403 without league data for an unauthorised role", async () => {
    const user = await createUser();
    const league = await createLeague(true);

    const response = await request(app)
      .get(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("id");
  });

  it("returns 401 for an unauthenticated detail request", async () => {
    const league = await createLeague(true);

    await request(app).get(`/api/v1/leagues/${league.id}`).expect(401);
  });

  it("returns 404 for a missing league", async () => {
    const user = await createAdmin();

    await request(app)
      .get("/api/v1/leagues/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(404);
  });

  it("rejects unauthenticated and non-admin permanent deletion", async () => {
    const league = await createLeague(true);
    const editor = await createEditor();

    await request(app).delete(`/api/v1/leagues/${league.id}`).send({ confirm: true }).expect(401);
    await request(app)
      .delete(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ confirm: true })
      .expect(403);
  });

  it("separates idempotent deactivation from confirmed permanent deletion for ADMIN", async () => {
    const admin = await createAdmin();
    const active = await createLeague(true);
    const inactive = await createLeague(false);

    await request(app)
      .patch(`/api/v1/leagues/${active.id}/deactivate`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);
    await expect(prisma.league.findUnique({ where: { id: active.id } }))
      .resolves.toMatchObject({ isActive: false, version: 1 });

    await request(app)
      .patch(`/api/v1/leagues/${active.id}/deactivate`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);
    await expect(prisma.league.findUnique({ where: { id: active.id } }))
      .resolves.toMatchObject({ isActive: false, version: 1 });

    await request(app)
      .delete(`/api/v1/leagues/${inactive.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ confirm: true })
      .expect(204);
    await expect(prisma.league.findUnique({ where: { id: inactive.id } }))
      .resolves.toBeNull();
  });

  it("allows ADMIN to reactivate an inactive league", async () => {
    const admin = await createAdmin();
    const league = await createLeague(false);

    const response = await request(app)
      .patch(`/api/v1/leagues/${league.id}/activate`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: league.id, status: "ACTIVE", version: 1 });
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ isActive: true, version: 1 });
  });

  it("rejects a form version opened before a status transition", async () => {
    const admin = await createAdmin();
    const league = await createLeague(false);

    await request(app)
      .patch(`/api/v1/leagues/${league.id}/activate`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    const response = await request(app)
      .patch(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ name: "Stale form update", version: league.version });

    expect(response.status).toBe(409);
    expect(errorCodeOf(response.body)).toBe("RESOURCE_VERSION_CONFLICT");
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ name: league.name, isActive: true, version: 1 });
  });

  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("allows activation for %s", async (_role, createUserForTest) => {
    const league = await createLeague(false);
    const user = createUserForTest == null ? null : await createUserForTest();
    const requestBuilder = request(app).patch(`/api/v1/leagues/${league.id}/activate`);

    if (user != null) requestBuilder.set("Authorization", `Bearer ${user.accessToken}`);

    await requestBuilder.expect(200);
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ isActive: true });
  });

  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("allows deactivation for %s", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const league = await createLeague(true);

    await request(app)
      .patch(`/api/v1/leagues/${league.id}/deactivate`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(200);
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ isActive: false, version: 1 });
  });

  it("requires confirmation and reports protected seasons", async () => {
    const admin = await createAdmin();
    const league = await createLeague(false);
    await prisma.season.create({
      data: {
        leagueSeasons: { create: { leagueId: league.id } },
        name: "2026-2027",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-05-31"),
      },
    });

    await request(app)
      .delete(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(400);

    const response = await request(app)
      .delete(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ confirm: true });

    expect(response.status).toBe(409);
    expect(errorCodeOf(response.body)).toBe("LEAGUE_DELETION_BLOCKED");
    expect((response.body as { error: { details: unknown[] } }).error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "seasons" }),
    ]));
    await expect(prisma.league.findUnique({ where: { id: league.id } })).resolves.not.toBeNull();
  });

  it("returns 404 when activating a missing league", async () => {
    const admin = await createAdmin();

    await request(app)
      .patch("/api/v1/leagues/00000000-0000-0000-0000-000000000000/activate")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(404);
  });
});
