import { createSeasonForLeague } from "../../helpers/season";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";

const createLeague = () => prisma.league.create({
  data: { name: `League ${randomUUID()}`, country: "France", isActive: true },
});

const createSeason = createSeasonForLeague;

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
    expect(response.body).toMatchObject({ seasonId: target.id, leagueId: league.id, isCurrent: true });
    await expect(prisma.leagueSeason.findUnique({ where: { id: target.leagueSeasonId } })).resolves.toMatchObject({ isCurrent: true });
  });

  it("keeps exactly one current season per league and is idempotent", async () => {
    const admin = await createAdmin();
    const league = await createLeague();
    const first = await createSeason(league.id, "2025-2026");
    const second = await createSeason(league.id, "2026-2027");

    await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${first.id}/current`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${second.id}/current`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${second.id}/current`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);

    await expect(prisma.leagueSeason.count({ where: { leagueId: league.id, isCurrent: true } })).resolves.toBe(1);
    await expect(prisma.leagueSeason.findUnique({ where: { id: first.leagueSeasonId } })).resolves.toMatchObject({ isCurrent: false });
    await expect(prisma.leagueSeason.findUnique({ where: { id: second.leagueSeasonId } })).resolves.toMatchObject({ isCurrent: true });
  });
});
