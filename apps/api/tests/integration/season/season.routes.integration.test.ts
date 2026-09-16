import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";

const createLeague = (isActive = true) => prisma.league.create({
  data: { name: `League ${randomUUID()}`, country: "France", isActive },
});

const createSeason = (leagueId: string, name = `Season ${randomUUID()}`) => prisma.season.create({
  data: {
    leagueId,
    name,
    startDate: new Date("2026-08-01"),
    endDate: new Date("2027-06-30"),
  },
});

describe("season routes", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["ADMIN", createAdmin, 201],
    ["MODERATOR", createModerator, 201],
    ["EDITOR", createEditor, 201],
    ["USER", createUser, 403],
  ] as const)("applies creation access rules to %s", async (_role, createUserForTest, expectedStatus) => {
    const user = await createUserForTest();
    const league = await createLeague();

    const response = await request(app)
      .post(`/api/v1/leagues/${league.id}/seasons`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(response.status).toBe(expectedStatus);
  });

  it("creates an inactive season for an active league", async () => {
    const user = await createAdmin();
    const league = await createLeague();

    const response = await request(app)
      .post(`/api/v1/leagues/${league.id}/seasons`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      leagueId: league.id,
      name: "2026-2027",
      status: "INACTIVE",
      version: 0,
    });
  });

  it("rejects creation for an inactive league and duplicate names", async () => {
    const user = await createAdmin();
    const inactiveLeague = await createLeague(false);

    const inactiveResponse = await request(app)
      .post(`/api/v1/leagues/${inactiveLeague.id}/seasons`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(inactiveResponse.status).toBe(409);
    expect(inactiveResponse.body.error.code).toBe("LEAGUE_INACTIVE");

    const activeLeague = await createLeague();
    const createRequest = () => request(app)
      .post(`/api/v1/leagues/${activeLeague.id}/seasons`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    await createRequest().send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" }).expect(201);
    const duplicateResponse = await createRequest().send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe("RESOURCE_ALREADY_EXISTS");
  });

  it("lists and details seasons with participating teams and matchdays", async () => {
    const user = await createAdmin();
    const league = await createLeague();
    const season = await createSeason(league.id, "2026-2027");
    const team = await prisma.team.create({ data: { name: "Paris FC", isActive: true } });
    await prisma.participation.create({ data: { teamId: team.id, seasonId: season.id } });
    await prisma.matchday.create({
      data: { seasonId: season.id, number: 1, name: "Journée 1", startDate: new Date("2026-08-15"), endDate: new Date("2026-08-16") },
    });

    const listResponse = await request(app)
      .get(`/api/v1/seasons?leagueId=${league.id}&status=INACTIVE`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const detailResponse = await request(app)
      .get(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      id: season.id,
      league: { id: league.id },
      participatingTeams: [{ id: team.id, status: "REGISTERED", points: 0, rank: null, scheduledMatchCount: 0 }],
      matchdays: [{ number: 1, matchCount: 0 }],
    });
  });

  it("exposes withdrawn participation history and scheduled match counts", async () => {
    const user = await createAdmin();
    const league = await createLeague();
    const season = await createSeason(league.id, "2030-2031");
    const withdrawnTeam = await prisma.team.create({ data: { name: "Withdrawn FC" } });
    const registeredTeam = await prisma.team.create({ data: { name: "Registered FC" } });
    await prisma.participation.create({
      data: { teamId: withdrawnTeam.id, seasonId: season.id, points: 8, rank: 3 },
    });
    await prisma.participation.create({ data: { teamId: registeredTeam.id, seasonId: season.id } });
    const matchday = await prisma.matchday.create({ data: { seasonId: season.id, number: 1 } });
    await prisma.gameMatch.create({
      data: {
        matchdayId: matchday.id,
        homeTeamId: withdrawnTeam.id,
        awayTeamId: registeredTeam.id,
        matchDate: new Date("2030-08-15"),
        startTime: new Date("1970-01-01T18:00:00.000Z"),
      },
    });
    await prisma.participation.update({
      where: { teamId_seasonId: { teamId: withdrawnTeam.id, seasonId: season.id } },
      data: { status: "WITHDRAWN" },
    });

    const response = await request(app)
      .get(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.participatingTeams).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: withdrawnTeam.id,
        status: "WITHDRAWN",
        points: 8,
        rank: 3,
        scheduledMatchCount: 1,
        registrationAt: expect.any(String),
      }),
      expect.objectContaining({ id: registeredTeam.id, status: "REGISTERED", scheduledMatchCount: 1 }),
    ]));
  });
});
