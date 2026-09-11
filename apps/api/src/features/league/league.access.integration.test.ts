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

const createLeague = (isActive: boolean) => prisma.league.create({
  data: {
    name: isActive ? "Active Security League" : "Inactive Security League",
    country: "France",
    isActive,
  },
});

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

  it("rejects unauthenticated and non-admin deletion", async () => {
    const league = await createLeague(true);
    const editor = await createEditor();

    await request(app).delete(`/api/v1/leagues/${league.id}`).expect(401);
    await request(app)
      .delete(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .expect(403);
  });

  it("deactivates active leagues and permanently deletes inactive leagues for ADMIN", async () => {
    const admin = await createAdmin();
    const active = await createLeague(true);
    const inactive = await createLeague(false);

    await request(app)
      .delete(`/api/v1/leagues/${active.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(204);
    await expect(prisma.league.findUnique({ where: { id: active.id } }))
      .resolves.toMatchObject({ isActive: false });

    await request(app)
      .delete(`/api/v1/leagues/${inactive.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(204);
    await expect(prisma.league.findUnique({ where: { id: inactive.id } }))
      .resolves.toBeNull();
  });
});
