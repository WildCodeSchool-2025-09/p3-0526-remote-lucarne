import request from "supertest";
import { describe, expect, it } from "vitest";
import { publicLeagueStatisticsSchema, publicMatchEventsSchema, publicPlayerStatisticsSchema, publicStandingsSchema, publicTeamStatisticsSchema } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createPublicSportsFixture } from "../../helpers/publicSports";

const leaguePath = (slug: string, seasonId: string, resource: string) => `/api/v1/leagues/by-slug/${slug}/seasons/${seasonId}/${resource}`;

describe("Read-only public statistics B2", () => {
  it("rebuilds complete standings with 3/1/0, zero-match teams and stable rank without writing Participation", async () => {
    const f = await createPublicSportsFixture();
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: f.teams[0].id, leagueSeasonId: f.season.leagueSeasonId } }, data: { points: 99, rank: 12 } });
    const path = leaguePath(f.league.slug, f.season.id, "standings");
    const response = await request(app).get(path).set("Authorization", "Bearer invalid").expect(200);
    const data = publicStandingsSchema.parse(response.body);
    expect(data.rows).toHaveLength(4);
    expect(data.rows[0]).toMatchObject({ rank: 1, team: { id: f.teams[0].id }, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 2, goalDifference: 1, points: 4 });
    expect(data.rows[1]).toMatchObject({ team: { id: f.teams[1].id }, points: 4, goalDifference: -1 });
    expect(data.rows.slice(2).every((row) => row.played === 0 && row.points === 0)).toBe(true);
    expect(data.rows[0].form.map((item) => item.result)).toEqual(["LOSS", "DRAW", "WIN"]);
    expect((await request(app).get(path).expect(200)).body).toEqual(response.body);
    const persisted = await prisma.participation.findUniqueOrThrow({ where: { teamId_leagueSeasonId: { teamId: f.teams[0].id, leagueSeasonId: f.season.leagueSeasonId } } });
    expect(persisted).toMatchObject({ points: 99, rank: 12 });
    await prisma.gameMatch.update({ where: { id: f.matches[0].id }, data: { homeScore: 0, awayScore: 1 } });
    const corrected = publicStandingsSchema.parse((await request(app).get(path).expect(200)).body);
    expect(corrected.rows[0]).toMatchObject({ team: { id: f.teams[1].id }, points: 7 });
    expect(corrected.rows.find((row) => row.team.id === f.teams[0].id)?.points).toBe(1);
  });

  it("separates recorded GOAL totals from score aggregates, paginates scorers and handles zero goals", async () => {
    const f = await createPublicSportsFixture();
    const response = publicLeagueStatisticsSchema.parse((await request(app).get(leaguePath(f.league.slug, f.season.id, "statistics")).query({ limit: 1 }).expect(200)).body);
    expect(response).toMatchObject({ completedMatches: 3, totalGoals: 5, homeWins: 1, draws: 1, awayWins: 1 });
    expect(response.goalsPerMatch).toBeCloseTo(5 / 3);
    expect(response.scorers.pagination).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(response.scorers.data[0]).toMatchObject({ goals: 2, rank: 1, player: { id: f.players[0].id } });
    const second = publicLeagueStatisticsSchema.parse((await request(app).get(leaguePath(f.league.slug, f.season.id, "statistics")).query({ limit: 1, page: 2 }).expect(200)).body);
    expect(second.scorers.data[0]).toMatchObject({ goals: 1, rank: 2, player: { id: f.players[1].id } });
    const query = { leagueId: f.league.id, seasonId: f.season.id };
    const playerPath = `/api/v1/public/players/${f.players[0].id}/statistics`;
    expect(publicPlayerStatisticsSchema.parse((await request(app).get(playerPath).query(query).expect(200)).body).goals).toBe(2);
    await prisma.matchEvent.deleteMany({ where: { playerId: f.players[0].id } });
    expect(publicPlayerStatisticsSchema.parse((await request(app).get(playerPath).query(query).expect(200)).body).goals).toBe(0);
    const teamStats = publicTeamStatisticsSchema.parse((await request(app).get(`/api/v1/public/teams/${f.teams[0].id}/statistics`).query(query).expect(200)).body);
    expect(teamStats).toMatchObject({ goalsFor: 3, goalsAgainst: 2, points: 4 });
  });

  it("excludes unfinished, draft and inactive-parent matches, then reflects withdrawal", async () => {
    const f = await createPublicSportsFixture();
    const unfinished = await prisma.gameMatch.create({ data: { matchdayId: f.days[3].id, homeTeamId: f.teams[0].id, awayTeamId: f.teams[1].id,
      matchDate: new Date("2026-10-25"), startTime: new Date("1970-01-01T18:00:00Z"), isPublished: true,
    } });
    await prisma.matchEvent.create({ data: { matchId: unfinished.id, playerId: f.players[0].id, minute: 1 } });
    const path = leaguePath(f.league.slug, f.season.id, "statistics");
    expect(publicLeagueStatisticsSchema.parse((await request(app).get(path).expect(200)).body)).toMatchObject({ completedMatches: 3, totalGoals: 5 });
    await prisma.matchday.update({ where: { id: f.days[0].id }, data: { isActive: false } });
    expect(publicLeagueStatisticsSchema.parse((await request(app).get(path).expect(200)).body)).toMatchObject({ completedMatches: 2, totalGoals: 3 });
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: f.teams[1].id, leagueSeasonId: f.season.leagueSeasonId } }, data: { status: "WITHDRAWN" } });
    const empty = publicLeagueStatisticsSchema.parse((await request(app).get(path).expect(200)).body);
    expect(empty).toMatchObject({ completedMatches: 0, totalGoals: 0, goalsPerMatch: null, scorers: { data: [] } });
    const rows = publicStandingsSchema.parse((await request(app).get(leaguePath(f.league.slug, f.season.id, "standings")).expect(200)).body).rows;
    expect(rows).toHaveLength(3); expect(rows.every((row) => row.points === 0)).toBe(true);
    await request(app).get(`/api/v1/public/teams/${f.teams[1].id}/statistics`).query({ leagueId: f.league.id, seasonId: f.season.id }).expect(404);
  });

  it("returns only visible goal identities and civil minutes and hides unpublished matches", async () => {
    const f = await createPublicSportsFixture();
    const path = `/api/v1/matches/${f.matches[0].matchPublicId}/events`;
    const events = publicMatchEventsSchema.parse((await request(app).get(path).expect(200)).body);
    expect(events.map((event) => event.minute)).toEqual([0, 25]);
    expect(events[0].player).toEqual({ id: f.players[0].id, firstName: "Éléonore", lastName: "Martin", pictureUrl: null });
    await prisma.player.update({ where: { id: f.players[0].id }, data: { isActive: false } });
    expect((await request(app).get(path).expect(200)).body).toEqual([]);
    await prisma.gameMatch.update({ where: { id: f.matches[0].id }, data: { isPublished: false, status: "SCHEDULED", homeScore: null, awayScore: null } });
    await request(app).get(path).expect(404);
  });

  it("isolates leagues sharing one season and rejects private or invalid query parameters", async () => {
    const f = await createPublicSportsFixture();
    const other = await prisma.league.create({ data: { name: "Other", country: "Belgique", isActive: true } });
    await prisma.leagueSeason.create({ data: { leagueId: other.id, seasonId: f.season.id } });
    const empty = publicStandingsSchema.parse((await request(app).get(leaguePath(other.slug, f.season.id, "standings")).expect(200)).body);
    expect(empty.rows).toEqual([]);
    await request(app).get(leaguePath(other.slug, f.season.id, "statistics")).query({ includeInactive: true }).expect(400);
    await request(app).get(`/api/v1/public/players/${f.players[0].id}/statistics`).query({ seasonId: f.season.id }).expect(400);
    await prisma.league.update({ where: { id: other.id }, data: { isActive: false } });
    await request(app).get(leaguePath(other.slug, f.season.id, "standings")).expect(404);
  });
});
