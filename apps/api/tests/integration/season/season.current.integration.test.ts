import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";

const createLeague = () => prisma.league.create({
  data: { name: `League ${randomUUID()}`, country: "France", isActive: true },
});

const createSeason = (leagueId: string, name: string) => prisma.season.create({
  data: { leagueId, name, startDate: new Date("2026-08-01"), endDate: new Date("2027-06-30") },
});

describe("PATCH /api/v1/leagues/:leagueId/seasons/:seasonId/current", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows only ADMIN to change the current season", async () => {
    const league = await createLeague();
    const target = await createSeason(league.id, "2026-2027");

    for (const createUserForTest of [createModerator, createEditor, createUser]) {
      const user = await createUserForTest();
      await request(app)
        .patch(`/api/v1/leagues/${league.id}/seasons/${target.id}/current`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .expect(403);
    }

    const admin = await createAdmin();
    const response = await request(app)
      .patch(`/api/v1/leagues/${league.id}/seasons/${target.id}/current`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: target.id, status: "CURRENT", version: 1 });
    await expect(prisma.season.findUnique({ where: { id: target.id } })).resolves.toMatchObject({ isActive: true, version: 1 });
  });

  it("keeps exactly one current season per league and is idempotent", async () => {
    const admin = await createAdmin();
    const league = await createLeague();
    const first = await createSeason(league.id, "2025-2026");
    const second = await createSeason(league.id, "2026-2027");

    await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${first.id}/current`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${second.id}/current`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${second.id}/current`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);

    await expect(prisma.season.count({ where: { leagueId: league.id, isActive: true } })).resolves.toBe(1);
    await expect(prisma.season.findUnique({ where: { id: first.id } })).resolves.toMatchObject({ isActive: false, version: 2 });
    await expect(prisma.season.findUnique({ where: { id: second.id } })).resolves.toMatchObject({ isActive: true, version: 1 });
  });
});
