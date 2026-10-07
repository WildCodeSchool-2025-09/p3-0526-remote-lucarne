import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Client } from "pg";
import prisma from "../../../database/prisma";
import { mapErrorToAppError } from "../../../src/errors/mapErrorToAppError";
import { createSeasonForLeague } from "../../helpers/season";

const fixture = async () => {
  const league = await prisma.league.create({ data: { name: `MATCH ${randomUUID()}`, country: "France" } });
  const season = await createSeasonForLeague(league.id);
  const teams = await Promise.all(["A", "B", "C"].map((name) => prisma.team.create({ data: { name } })));
  await prisma.participation.createMany({ data: teams.map((team) => ({ teamId: team.id, leagueSeasonId: season.leagueSeasonId })) });
  const days = await Promise.all([1, 2].map((number) => prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number } })));
  return { league, season, teams, days };
};

const expectDomainError = async (operation: Promise<unknown>, code: string) => {
  try {
    await operation;
  } catch (error) {
    expect(mapErrorToAppError(error)).toMatchObject({ code });
    return;
  }
  throw new Error(`Expected ${code}`);
};

describe("MATCH database constraints", () => {
  it("reserves both sides including partially prepared slots, and rolls back conflicting changes", async () => {
    const { teams: [a, b, c], days: [day, next] } = await fixture();
    const match = await prisma.gameMatch.create({ data: { matchdayId: day.id, homeTeamId: a.id, awayTeamId: b.id } });
    await expectDomainError(prisma.gameMatch.create({ data: { matchdayId: day.id, awayTeamId: a.id } }), "MATCH_TEAM_MATCHDAY_CONFLICT");
    const slot = await prisma.gameMatch.create({ data: { matchdayId: day.id, homeTeamId: c.id } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: slot.id }, data: { homeTeamId: b.id } }), "MATCH_TEAM_MATCHDAY_CONFLICT");
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toMatchObject({ homeTeamId: c.id });
    expect(await prisma.matchTeamReservation.count()).toBe(3);
    await prisma.gameMatch.update({ where: { id: match.id }, data: { matchdayId: next.id } });
    await prisma.gameMatch.update({ where: { id: slot.id }, data: { awayTeamId: a.id } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: match.id }, data: { matchdayId: day.id } }), "MATCH_TEAM_MATCHDAY_CONFLICT");
    expect(await prisma.gameMatch.findUnique({ where: { id: match.id } })).toMatchObject({ matchdayId: next.id });
  });

  it("releases reservations on deactivation/deletion, checks reactivation, and permits unchanged participants", async () => {
    const { teams: [a], days: [day] } = await fixture();
    const match = await prisma.gameMatch.create({ data: { matchdayId: day.id, homeTeamId: a.id } });
    await prisma.gameMatch.update({ where: { id: match.id }, data: { homeTeamId: a.id } });
    await prisma.gameMatch.update({ where: { id: match.id }, data: { isActive: false } });
    const other = await prisma.gameMatch.create({ data: { matchdayId: day.id, awayTeamId: a.id } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: match.id }, data: { isActive: true } }), "MATCH_TEAM_MATCHDAY_CONFLICT");
    await prisma.gameMatch.delete({ where: { id: other.id } });
    await prisma.gameMatch.update({ where: { id: match.id }, data: { isActive: true } });
    await prisma.gameMatch.update({ where: { id: match.id }, data: { homeTeamId: null } });
    expect(await prisma.matchTeamReservation.count()).toBe(0);
  });

  it("maps registration, publication, score and field failures from real Prisma errors", async () => {
    const { teams: [a, b], days: [day], season } = await fixture();
    const slot = await prisma.gameMatch.create({ data: { matchdayId: day.id } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: slot.id }, data: { isPublished: true } }), "MATCH_PUBLICATION_INCOMPLETE");
    await expectDomainError(prisma.gameMatch.update({ where: { id: slot.id }, data: { homeTeamId: a.id, awayTeamId: a.id } }), "VALIDATION_ERROR");
    await prisma.gameMatch.update({ where: { id: slot.id }, data: { homeTeamId: a.id, awayTeamId: b.id, matchDate: new Date("2026-10-05"), startTime: new Date("1970-01-01T18:30:00Z") } });
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: b.id, leagueSeasonId: season.leagueSeasonId } }, data: { status: "WITHDRAWN" } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: slot.id }, data: { isPublished: true } }), "MATCH_TEAM_NOT_REGISTERED");
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: b.id, leagueSeasonId: season.leagueSeasonId } }, data: { status: "REGISTERED" } });
    await prisma.gameMatch.update({ where: { id: slot.id }, data: { isPublished: true } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: slot.id }, data: { status: "COMPLETED" } }), "MATCH_RESULT_REQUIRED");
    await prisma.gameMatch.update({ where: { id: slot.id }, data: { status: "COMPLETED", homeScore: 0, awayScore: 0 } });
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: b.id, leagueSeasonId: season.leagueSeasonId } }, data: { status: "WITHDRAWN" } });
    await prisma.gameMatch.update({ where: { id: slot.id }, data: { homeScore: 2 } });
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toMatchObject({ status: "COMPLETED", homeScore: 2, awayScore: 0 });
    await expectDomainError(prisma.gameMatch.create({ data: { matchdayId: randomUUID() } }), "RESOURCE_NOT_FOUND");
  });

  it("rejects movement across editions, including movement of the parent day", async () => {
    const { league, season, days: [day] } = await fixture();
    const otherSeason = await createSeasonForLeague(league.id);
    const otherDay = await prisma.matchday.create({ data: { leagueSeasonId: otherSeason.leagueSeasonId, number: 1 } });
    const slot = await prisma.gameMatch.create({ data: { matchdayId: day.id } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: slot.id }, data: { matchdayId: otherDay.id } }), "MATCH_EDITION_CHANGE_FORBIDDEN");
    await prisma.gameMatch.update({ where: { id: slot.id }, data: { isActive: false } });
    await expectDomainError(prisma.gameMatch.update({ where: { id: slot.id }, data: { matchdayId: otherDay.id } }), "MATCH_EDITION_CHANGE_FORBIDDEN");
    await expectDomainError(prisma.matchday.update({ where: { id: day.id }, data: { leagueSeasonId: otherSeason.leagueSeasonId } }), "MATCH_EDITION_CHANGE_FORBIDDEN");
    expect(await prisma.matchday.findUnique({ where: { id: day.id } })).toMatchObject({ leagueSeasonId: season.leagueSeasonId });
  });

  it.each(["READ COMMITTED", "REPEATABLE READ"])("arbitrates concurrent cross-side assignments under %s", async (isolation) => {
    const { teams: [a], days: [day] } = await fixture();
    const clients = [new Client({ connectionString: process.env.TEST_DATABASE_URL }), new Client({ connectionString: process.env.TEST_DATABASE_URL })];
    try {
      await Promise.all(clients.map(async (client) => {
        await client.connect();
        await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
        await client.query("SET LOCAL lock_timeout='3s'");
        await client.query("SELECT count(*) FROM game_match"); // Freeze both RR snapshots before either write.
      }));
      const outcomes = await Promise.allSettled(clients.map(async (client, index) => {
        await client.query(`INSERT INTO game_match(matchday_id,${index === 0 ? "home_team_id" : "away_team_id"}) VALUES ($1,$2)`, [day.id, a.id]);
        await client.query("COMMIT");
      }));
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      const failure = outcomes.find((outcome) => outcome.status === "rejected");
      expect(failure).toMatchObject({ reason: { code: "LM001" } });
      expect(await prisma.gameMatch.count()).toBe(1);
      expect(await prisma.matchTeamReservation.count()).toBe(1);
    } finally {
      await Promise.all(clients.map(async (client) => { await client.query("ROLLBACK"); await client.end(); }));
    }
  });
});
