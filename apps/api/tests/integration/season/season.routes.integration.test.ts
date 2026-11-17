import { createSeasonForLeague } from "../../helpers/season";
import { randomUUID } from "node:crypto";
import type { ApiErrorResponse, PaginatedSeasonsResponse, SeasonDetail } from "@lucarne/shared";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";

const createLeague = (isActive = true) => prisma.league.create({
  data: { name: `League ${randomUUID()}`, country: "France", isActive },
});

const createSeason = createSeasonForLeague;

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

    const response = await request(app)
      .post("/api/v1/seasons")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(response.status).toBe(expectedStatus);
  });

  it("creates a global season without requiring a league", async () => {
    const user = await createAdmin();

    const response = await request(app)
      .post("/api/v1/seasons")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "2026-2027",
      version: 0,
    });
  });

  it("rejects duplicate names globally", async () => {
    const user = await createAdmin();
    const createRequest = () => request(app)
      .post("/api/v1/seasons")
      .set("Authorization", `Bearer ${user.accessToken}`);
    await createRequest().send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" }).expect(201);
    const duplicateResponse = await createRequest().send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(duplicateResponse.status).toBe(409);
    expect((duplicateResponse.body as ApiErrorResponse).error.code).toBe("RESOURCE_ALREADY_EXISTS");
  });

  it("lists and details seasons with participating teams and matchdays", async () => {
    const user = await createAdmin();
    const league = await createLeague();
    const season = await createSeason(league.id, "2026-2027");
    const team = await prisma.team.create({ data: { name: "Paris FC", isActive: true } });
    await prisma.participation.create({ data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } });
    await prisma.matchday.create({
      data: { leagueSeasonId: season.leagueSeasonId, number: 1, name: "Journée 1", startDate: new Date("2026-08-15"), endDate: new Date("2026-08-16") },
    });

    const listResponse = await request(app)
      .get(`/api/v1/seasons?leagueId=${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(listResponse.status).toBe(200);
    expect((listResponse.body as PaginatedSeasonsResponse).data).toHaveLength(1);
    expect((listResponse.body as PaginatedSeasonsResponse).data[0]).toMatchObject({
      id: season.id,
      leagueSeasons: [{ league: { id: league.id, name: league.name, country: league.country } }],
    });

    const detailResponse = await request(app)
      .get(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body as SeasonDetail).toMatchObject({
      id: season.id,
      leagueSeasons: [{ league: { id: league.id },
        participatingTeams: [{ id: team.id, status: "REGISTERED", points: 0, rank: null, scheduledMatchCount: 0 }],
        matchdays: [{ number: 1, matchCount: 0 }] }],
    });
  });

  it("exposes withdrawn participation history and scheduled match counts", async () => {
    const user = await createAdmin();
    const league = await createLeague();
    const season = await createSeason(league.id, "2030-2031");
    const withdrawnTeam = await prisma.team.create({ data: { name: "Withdrawn FC" } });
    const registeredTeam = await prisma.team.create({ data: { name: "Registered FC" } });
    await prisma.participation.create({
      data: { teamId: withdrawnTeam.id, leagueSeasonId: season.leagueSeasonId, points: 8, rank: 3 },
    });
    await prisma.participation.create({ data: { teamId: registeredTeam.id, leagueSeasonId: season.leagueSeasonId } });
    const matchday = await prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number: 1 } });
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
      where: { teamId_leagueSeasonId: { teamId: withdrawnTeam.id, leagueSeasonId: season.leagueSeasonId } },
      data: { status: "WITHDRAWN" },
    });

    const response = await request(app)
      .get(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    const seasonDetail = response.body as SeasonDetail;
    expect(seasonDetail.leagueSeasons[0].participatingTeams).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: withdrawnTeam.id,
        status: "WITHDRAWN",
        points: 8,
        rank: 3,
        scheduledMatchCount: 1,
      }),
      expect.objectContaining({ id: registeredTeam.id, status: "REGISTERED", scheduledMatchCount: 1 }),
    ]));
    expect(seasonDetail.leagueSeasons[0].participatingTeams.find((participation) => participation.id === withdrawnTeam.id)?.registrationAt).toEqual(expect.any(String));
  });
});
