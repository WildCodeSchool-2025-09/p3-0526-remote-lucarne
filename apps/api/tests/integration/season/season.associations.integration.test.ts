import { randomUUID } from "node:crypto";
import type { ApiErrorResponse, PaginatedLeagueSeasonsResponse, SeasonDetail } from "@lucarne/shared";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";

const createLeague = () => prisma.league.create({ data: { name: `League ${randomUUID()}`, country: "France" } });
const createSeason = () => prisma.season.create({ data: { name: `Season ${randomUUID()}`, startDate: new Date("2026-08-01"), endDate: new Date("2027-06-30") } });
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const configuration = { matchdayCount: 22, matchesPerMatchday: 6 };

describe("league season association routes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generates independent calendars for a shared season and rejects duplicate pairs without regenerating", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const admin = await createAdmin();
    const leagueOne = await createLeague();
    const leagueTwo = await createLeague();
    const season = await createSeason();

    const first = await request(app).post(`/api/v1/leagues/${leagueOne.id}/seasons`).set(auth(admin.accessToken)).send({ seasonId: season.id, ...configuration }).expect(201);
    expect(first.body).toMatchObject({ seasonId: season.id, leagueId: leagueOne.id, ...configuration });
    await request(app).post(`/api/v1/leagues/${leagueTwo.id}/seasons`).set(auth(admin.accessToken)).send({ seasonId: season.id, matchdayCount: 18, matchesPerMatchday: 5 }).expect(201);
    const duplicate = await request(app).post(`/api/v1/leagues/${leagueOne.id}/seasons`).set(auth(admin.accessToken)).send({ seasonId: season.id, matchdayCount: 1, matchesPerMatchday: 1 });
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as ApiErrorResponse).error.code).toBe("RESOURCE_ALREADY_EXISTS");
    expect(await prisma.leagueSeason.count({ where: { seasonId: season.id } })).toBe(2);
    expect(await prisma.leagueSeason.findUnique({ where: { leagueId_seasonId: { leagueId: leagueOne.id, seasonId: season.id } } })).toMatchObject(configuration);

    const listing = await request(app).get(`/api/v1/leagues/${leagueOne.id}/seasons`).set(auth(admin.accessToken)).expect(200);
    expect((listing.body as PaginatedLeagueSeasonsResponse).data).toMatchObject([{ ...configuration, season: { id: season.id }, dependencyCounts: { matchdays: 22, participations: 0 } }]);
    const detail = await request(app).get(`/api/v1/seasons/${season.id}`).set(auth(admin.accessToken)).expect(200);
    expect((detail.body as SeasonDetail).leagueSeasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ leagueId: leagueOne.id, ...configuration }),
      expect.objectContaining({ leagueId: leagueTwo.id, matchdayCount: 18, matchesPerMatchday: 5 }),
    ]));
    expect(await prisma.matchday.count()).toBe(40);
    expect(await prisma.gameMatch.count()).toBe(222);
    for (const edition of (detail.body as SeasonDetail).leagueSeasons) {
      const count = edition.leagueId === leagueOne.id ? 22 : 18;
      const perDay = edition.leagueId === leagueOne.id ? 6 : 5;
      expect(edition.matchdays.map((day) => day.number)).toEqual(Array.from({ length: count }, (_, index) => index + 1));
      expect(edition.matchdays.every((day) => day.matchCount === perDay && day.name === null && day.startDate === null && day.endDate === null)).toBe(true);
    }
    const slots = await prisma.gameMatch.findMany();
    expect(slots.every((slot) => slot.homeTeamId === null && slot.awayTeamId === null && slot.matchDate === null && slot.startTime === null
      && slot.homeScore === null && slot.awayScore === null && slot.stadium === null && slot.status === "SCHEDULED" && !slot.isPublished && slot.isActive && slot.version === 0)).toBe(true);
    expect(new Set(slots.map((slot) => slot.matchPublicId)).size).toBe(222);
    expect(await prisma.matchTeamReservation.count()).toBe(0);
    const removal = await request(app).delete(`/api/v1/leagues/${leagueOne.id}/seasons/${season.id}`).set(auth(admin.accessToken));
    expect(removal.status).toBe(409);
    expect(await prisma.gameMatch.count()).toBe(222);
  });

  it.each([
    ["ADMIN", createAdmin, 201], ["MODERATOR", createModerator, 403], ["EDITOR", createEditor, 403],
  ] as const)("checks %s permission to generate a calendar", async (_role, createActor, status) => {
    const actor = await createActor();
    const league = await createLeague();
    const season = await createSeason();
    await request(app).post(`/api/v1/leagues/${league.id}/seasons`).set(auth(actor.accessToken)).send({ seasonId: season.id, ...configuration }).expect(status);
    expect(await prisma.leagueSeason.count()).toBe(status === 201 ? 1 : 0);
    expect(await prisma.matchday.count()).toBe(status === 201 ? 22 : 0);
    expect(await prisma.gameMatch.count()).toBe(status === 201 ? 132 : 0);
  });

  it("rejects unauthenticated and USER writes without creating an association", async () => {
    const user = await createUser();
    const league = await createLeague();
    const season = await createSeason();
    const url = `/api/v1/leagues/${league.id}/seasons`;
    const input = { seasonId: season.id, ...configuration };
    await request(app).post(url).send(input).expect(401);
    await request(app).post(url).set(auth(user.accessToken)).send(input).expect(403);
    expect(await prisma.leagueSeason.count()).toBe(0);
  });

  it.each([
    {}, { matchdayCount: 22 }, { matchesPerMatchday: 6 },
    { matchdayCount: null, matchesPerMatchday: 6 },
    { matchdayCount: 0, matchesPerMatchday: 6 },
    { matchdayCount: 22, matchesPerMatchday: -1 },
    { matchdayCount: 1.5, matchesPerMatchday: 6 },
    { matchdayCount: 22, matchesPerMatchday: "6" },
    { matchdayCount: 2_147_483_648, matchesPerMatchday: 6 },
  ])("rejects invalid configuration %j without persisting anything", async (values) => {
    const admin = await createAdmin();
    const league = await createLeague();
    const season = await createSeason();
    const response = await request(app).post(`/api/v1/leagues/${league.id}/seasons`).set(auth(admin.accessToken)).send({ seasonId: season.id, ...values });
    expect(response.status).toBe(400);
    expect((response.body as ApiErrorResponse).error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.leagueSeason.count()).toBe(0);
  });

  it.each(["league", "season"] as const)("returns 404 for a missing %s without persisting anything", async (missing) => {
    const admin = await createAdmin();
    const league = await createLeague();
    const season = await createSeason();
    const response = await request(app).post(`/api/v1/leagues/${missing === "league" ? randomUUID() : league.id}/seasons`).set(auth(admin.accessToken))
      .send({ seasonId: missing === "season" ? randomUUID() : season.id, ...configuration });
    expect(response.status).toBe(404);
    expect((response.body as ApiErrorResponse).error.code).toBe("RESOURCE_NOT_FOUND");
    expect(await prisma.leagueSeason.count()).toBe(0);
  });

  it("keeps configuration fixed when marking an association current or editing the season", async () => {
    const admin = await createAdmin();
    const league = await createLeague();
    const season = await createSeason();
    await request(app).post(`/api/v1/leagues/${league.id}/seasons`).set(auth(admin.accessToken)).send({ seasonId: season.id, ...configuration }).expect(201);
    const calendarBefore = await prisma.gameMatch.findMany({ orderBy: { id: "asc" } });
    const current = await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${season.id}/current`).set(auth(admin.accessToken)).expect(200);
    expect(current.body).toMatchObject({ isCurrent: true, ...configuration });
    await request(app).patch(`/api/v1/seasons/${season.id}`).set(auth(admin.accessToken)).send({ version: season.version, name: "Updated season", matchdayCount: 1, matchesPerMatchday: 1 }).expect(400);
    expect(await prisma.leagueSeason.findUnique({ where: { leagueId_seasonId: { leagueId: league.id, seasonId: season.id } } })).toMatchObject(configuration);
    expect(await prisma.season.findUnique({ where: { id: season.id } })).toMatchObject({ name: season.name, version: season.version });
    expect(await prisma.gameMatch.findMany({ orderBy: { id: "asc" } })).toEqual(calendarBefore);
  });

  it("blocks deleting linked seasons and removing associations with sporting history", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const admin = await createAdmin();
    const league = await createLeague();
    const season = await createSeason();
    const edition = await prisma.leagueSeason.create({ data: { leagueId: league.id, seasonId: season.id } });

    const deleteLinked = await request(app).delete(`/api/v1/seasons/${season.id}`).set(auth(admin.accessToken)).send({ confirm: true });
    expect(deleteLinked.status).toBe(409);
    expect((deleteLinked.body as ApiErrorResponse).error.code).toBe("SEASON_DELETION_BLOCKED");

    await prisma.matchday.create({ data: { leagueSeasonId: edition.id, number: 1 } });
    const removeHistorical = await request(app).delete(`/api/v1/leagues/${league.id}/seasons/${season.id}`).set(auth(admin.accessToken));
    expect(removeHistorical.status).toBe(409);
    expect((removeHistorical.body as ApiErrorResponse).error.code).toBe("LEAGUE_SEASON_REMOVAL_BLOCKED");
  });

  it("allows removing an empty association but keeps association management role-protected", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const admin = await createAdmin();
    const user = await createUser();
    const league = await createLeague();
    const season = await createSeason();
    await prisma.leagueSeason.create({ data: { leagueId: league.id, seasonId: season.id } });

    await request(app).delete(`/api/v1/leagues/${league.id}/seasons/${season.id}`).set(auth(user.accessToken)).expect(403);
    await request(app).delete(`/api/v1/leagues/${league.id}/seasons/${season.id}`).set(auth(admin.accessToken)).expect(204);
    await request(app).delete(`/api/v1/seasons/${season.id}`).set(auth(admin.accessToken)).send({ confirm: true }).expect(204);
  });

  it("rolls back the association, all days and all slots when generation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const admin = await createAdmin();
    const league = await createLeague(); const season = await createSeason();
    await prisma.$executeRaw`CREATE FUNCTION test_calendar_failure() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'Injected calendar failure'; END $$ LANGUAGE plpgsql`;
    await prisma.$executeRaw`CREATE TRIGGER test_calendar_failure AFTER INSERT ON game_match
      FOR EACH ROW EXECUTE FUNCTION test_calendar_failure()`;
    try {
      await request(app).post(`/api/v1/leagues/${league.id}/seasons`).set(auth(admin.accessToken))
        .send({ seasonId: season.id, matchdayCount: 2, matchesPerMatchday: 3 }).expect(500);
      expect(await prisma.leagueSeason.count()).toBe(0);
      expect(await prisma.matchday.count()).toBe(0);
      expect(await prisma.gameMatch.count()).toBe(0);
      expect(await prisma.matchTeamReservation.count()).toBe(0);
    } finally {
      await prisma.$executeRaw`DROP TRIGGER test_calendar_failure ON game_match`;
      await prisma.$executeRaw`DROP FUNCTION test_calendar_failure()`;
    }
    await request(app).post(`/api/v1/leagues/${league.id}/seasons`).set(auth(admin.accessToken))
      .send({ seasonId: season.id, matchdayCount: 2, matchesPerMatchday: 3 }).expect(201);
    expect(await prisma.gameMatch.count()).toBe(6);
  });

  it("cancels an overlong generation with a recoverable error and no partial calendar", async () => {
    const admin = await createAdmin();
    const league = await createLeague(); const season = await createSeason();
    await prisma.$executeRaw`CREATE FUNCTION test_calendar_slow() RETURNS trigger AS $$
      BEGIN PERFORM pg_sleep(5); RETURN NEW; END $$ LANGUAGE plpgsql`;
    await prisma.$executeRaw`CREATE TRIGGER test_calendar_slow AFTER INSERT ON game_match
      FOR EACH ROW EXECUTE FUNCTION test_calendar_slow()`;
    try {
      const response = await request(app).post(`/api/v1/leagues/${league.id}/seasons`).set(auth(admin.accessToken))
        .send({ seasonId: season.id, matchdayCount: 1, matchesPerMatchday: 1 });
      expect(response.status).toBe(503);
      expect((response.body as ApiErrorResponse).error.code).toBe("CALENDAR_GENERATION_TIMEOUT");
      expect(await prisma.leagueSeason.count()).toBe(0);
      expect(await prisma.matchday.count()).toBe(0);
      expect(await prisma.gameMatch.count()).toBe(0);
    } finally {
      await prisma.$executeRaw`DROP TRIGGER test_calendar_slow ON game_match`;
      await prisma.$executeRaw`DROP FUNCTION test_calendar_slow()`;
    }
  }, 10_000);

  it("generates only one calendar when the same pair is requested concurrently", async () => {
    const admin = await createAdmin();
    const league = await createLeague(); const season = await createSeason();
    const create = () => request(app).post(`/api/v1/leagues/${league.id}/seasons`).set(auth(admin.accessToken))
      .send({ seasonId: season.id, matchdayCount: 3, matchesPerMatchday: 2 });
    const responses = await Promise.all([create(), create()]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.leagueSeason.count()).toBe(1);
    expect(await prisma.matchday.count()).toBe(3);
    expect(await prisma.gameMatch.count()).toBe(6);
  });

  it("preserves existing unconfigured associations without generating or repairing them on reads", async () => {
    const admin = await createAdmin();
    const league = await createLeague(); const season = await createSeason();
    const edition = await prisma.leagueSeason.create({ data: { leagueId: league.id, seasonId: season.id } });
    const day = await prisma.matchday.create({ data: { leagueSeasonId: edition.id, number: 7 } });
    await request(app).get(`/api/v1/seasons/${season.id}`).set(auth(admin.accessToken)).expect(200);
    await request(app).get(`/api/v1/leagues/${league.id}/seasons`).set(auth(admin.accessToken)).expect(200);
    await request(app).patch(`/api/v1/leagues/${league.id}/seasons/${season.id}/current`).set(auth(admin.accessToken)).expect(200);
    expect(await prisma.matchday.findMany()).toEqual([day]);
    expect(await prisma.gameMatch.count()).toBe(0);
    expect(await prisma.leagueSeason.findUnique({ where: { id: edition.id } })).toMatchObject({ matchdayCount: null, matchesPerMatchday: null });
  });
});
