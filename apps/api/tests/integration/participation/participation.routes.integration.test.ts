import { createSeasonForLeague } from "../../helpers/season";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";
import { Prisma } from "../../../src/generated/prisma/client";
import * as participationRepository from "../../../src/features/participation/participation.repository";

const createSeasonFixture = async () => {
  const league = await prisma.league.create({
    data: { name: `League ${randomUUID()}`, country: "France", isActive: true },
  });
  const season = await createSeasonForLeague(league.id);
  const team = await prisma.team.create({ data: { name: `Team ${randomUUID()}` } });
  return { season, team, league };
};

describe("participation routes", () => {
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
  ] as const)("allows %s to register a team", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const { season, team } = await createSeasonFixture();

    const response = await request(app)
      .post(`/api/v1/league-seasons/${season.leagueSeasonId}/participations`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ teamId: team.id });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      teamId: team.id,
      leagueSeasonId: season.leagueSeasonId,
      points: 0,
      rank: null,
      status: "REGISTERED",
    });
  });

  it("rejects USER and invalid payloads", async () => {
    const user = await createUser();
    const { season, team } = await createSeasonFixture();
    const url = `/api/v1/league-seasons/${season.leagueSeasonId}/participations`;

    await expect(request(app).post(url).send({ teamId: team.id })).resolves.toMatchObject({ status: 401 });
    await expect(request(app)
      .post(url)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ teamId: "invalid" })).resolves.toMatchObject({ status: 403 });
  });

  it("rejects a duplicate without creating another row", async () => {
    const user = await createAdmin();
    const { season, team } = await createSeasonFixture();
    const requestRegistration = () => request(app)
      .post(`/api/v1/league-seasons/${season.leagueSeasonId}/participations`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ teamId: team.id });

    await requestRegistration().expect(201);
    const duplicate = await requestRegistration();

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ error: { code: "PARTICIPATION_ALREADY_EXISTS" } });
    await expect(prisma.participation.count({ where: { leagueSeasonId: season.leagueSeasonId, teamId: team.id } })).resolves.toBe(1);
  });

  it.each([
    ["ADMIN", createAdmin], ["MODERATOR", createModerator], ["EDITOR", createEditor],
  ] as const)("allows %s to withdraw while preserving history and blocking association removal", async (_role, createActor) => {
    const user = await createActor();
    const { season, team, league } = await createSeasonFixture();
    const original = await prisma.participation.create({
      data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId, points: 8, rank: 3 },
    });

    const preview = await request(app)
      .get(`/api/v1/league-seasons/${season.leagueSeasonId}/participations/${team.id}/withdrawal-preview`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    const withdrawal = await request(app)
      .delete(`/api/v1/league-seasons/${season.leagueSeasonId}/participations/${team.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(preview.status).toBe(200);
    expect(preview.body).toEqual({ teamId: team.id, leagueSeasonId: season.leagueSeasonId, scheduledMatchCount: 0 });
    expect(withdrawal.status).toBe(200);
    expect(withdrawal.body).toMatchObject({
      participation: { teamId: team.id, leagueSeasonId: season.leagueSeasonId, points: 8, rank: 3, status: "WITHDRAWN" },
      scheduledMatchCount: 0,
    });
    await expect(prisma.participation.count({ where: { leagueSeasonId: season.leagueSeasonId, teamId: team.id } })).resolves.toBe(1);
    expect(await prisma.participation.findUnique({ where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } } })).toEqual({ ...original, status: "WITHDRAWN" });
    expect(await prisma.team.findUnique({ where: { id: team.id } })).toEqual(team);
    const removal = await request(app).delete(`/api/v1/leagues/${league.id}/seasons/${season.id}`).set("Authorization", `Bearer ${user.accessToken}`);
    expect(removal.status).toBe(409);
    expect(removal.body).toMatchObject({ error: { code: "LEAGUE_SEASON_REMOVAL_BLOCKED" } });
    expect(await prisma.leagueSeason.count({ where: { id: season.leagueSeasonId } })).toBe(1);
    await request(app).post(`/api/v1/league-seasons/${season.leagueSeasonId}/participations`).set("Authorization", `Bearer ${user.accessToken}`).send({ teamId: team.id }).expect(201);
    expect(await prisma.participation.findUnique({ where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } } })).toEqual(original);
  });

  it("preserves scheduled matches, results and other league-season participations on repeated withdrawal", async () => {
    const admin = await createAdmin();
    const { season, team, league } = await createSeasonFixture();
    const otherLeague = await prisma.league.create({ data: { name: `Other league ${randomUUID()}`, country: "France" } });
    const otherEdition = await prisma.leagueSeason.create({ data: { leagueId: otherLeague.id, seasonId: season.id } });
    const otherSeason = await createSeasonForLeague(league.id);
    const awayTeam = await prisma.team.create({ data: { name: `Away team ${randomUUID()}` } });
    await prisma.participation.createMany({ data: [
      { teamId: team.id, leagueSeasonId: season.leagueSeasonId, points: 8, rank: 3 },
      { teamId: awayTeam.id, leagueSeasonId: season.leagueSeasonId },
      { teamId: team.id, leagueSeasonId: otherEdition.id },
      { teamId: team.id, leagueSeasonId: otherSeason.leagueSeasonId },
    ] });
    const before = await prisma.participation.findMany({ where: { teamId: team.id }, orderBy: { leagueSeasonId: "asc" } });
    const day = await prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number: 1 } });
    const matchData = { matchdayId: day.id, homeTeamId: team.id, awayTeamId: awayTeam.id, matchDate: new Date("2026-09-01"), startTime: new Date("1970-01-01T18:00:00Z") };
    const scheduled = await prisma.gameMatch.create({ data: matchData });
    const completedDay = await prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number: 2 } });
    const completed = await prisma.gameMatch.create({ data: { ...matchData, matchdayId: completedDay.id, isPublished: true, status: "COMPLETED", homeScore: 2, awayScore: 1 } });
    const url = `/api/v1/league-seasons/${season.leagueSeasonId}/participations/${team.id}`;
    const preview = await request(app).get(`${url}/withdrawal-preview`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    expect(preview.body).toMatchObject({ scheduledMatchCount: 1 });
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request(app).delete(url).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
      expect(response.body).toMatchObject({ scheduledMatchCount: 1, participation: { status: "WITHDRAWN" } });
    }
    const after = await prisma.participation.findMany({ where: { teamId: team.id }, orderBy: { leagueSeasonId: "asc" } });
    expect(after).toEqual(before.map((participation) => participation.leagueSeasonId === season.leagueSeasonId ? { ...participation, status: "WITHDRAWN" } : participation));
    expect(await prisma.team.findUnique({ where: { id: team.id } })).toEqual(team);
    expect(await prisma.gameMatch.findUnique({ where: { id: scheduled.id } })).toEqual(scheduled);
    expect(await prisma.gameMatch.findUnique({ where: { id: completed.id } })).toEqual(completed);
  });

  it("rejects unauthenticated and USER previews and withdrawals without changing participation", async () => {
    const user = await createUser();
    const { season, team } = await createSeasonFixture();
    const original = await prisma.participation.create({ data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } });
    const url = `/api/v1/league-seasons/${season.leagueSeasonId}/participations/${team.id}`;
    await request(app).get(`${url}/withdrawal-preview`).expect(401);
    await request(app).get(`${url}/withdrawal-preview`).set("Authorization", `Bearer ${user.accessToken}`).expect(403);
    await request(app).delete(url).expect(401);
    await request(app).delete(url).set("Authorization", `Bearer ${user.accessToken}`).expect(403);
    expect(await prisma.participation.findUnique({ where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } } })).toEqual(original);
  });

  it("returns an explicit error when the participation does not exist", async () => {
    const user = await createAdmin();
    const { season, team } = await createSeasonFixture();

    const response = await request(app)
      .delete(`/api/v1/league-seasons/${season.leagueSeasonId}/participations/${team.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { code: "RESOURCE_NOT_FOUND" } });
    const preview = await request(app).get(`/api/v1/league-seasons/${season.leagueSeasonId}/participations/${team.id}/withdrawal-preview`).set("Authorization", `Bearer ${user.accessToken}`);
    expect(preview.status).toBe(404);
    expect(preview.body).toMatchObject({ error: { code: "RESOURCE_NOT_FOUND" } });
  });

  it("returns an explicit conflict without changing history when the withdrawal transaction conflicts", async () => {
    const admin = await createAdmin();
    const { season, team } = await createSeasonFixture();
    const original = await prisma.participation.create({ data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId, points: 8, rank: 3 } });
    vi.spyOn(participationRepository, "withdrawParticipation").mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "7" }));
    const response = await request(app).delete(`/api/v1/league-seasons/${season.leagueSeasonId}/participations/${team.id}`).set("Authorization", `Bearer ${admin.accessToken}`);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: { code: "PARTICIPATION_CONFLICT" } });
    expect(await prisma.participation.findUnique({ where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } } })).toEqual(original);
  });
});
