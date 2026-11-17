import request from "supertest";
import { describe, expect, it } from "vitest";
import { publicSearchResponseSchema } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { assignmentDate } from "../../../src/utils/assignmentPeriod";
import { createPublicSportsFixture } from "../../helpers/publicSports";
import { createAdmin } from "../../helpers/auth";

const base = "/api/v1/public/search";
const search = async (query: Record<string, string | number> = {}) => publicSearchResponseSchema.parse((await request(app).get(base).query(query).expect(200)).body);

describe("Global public search B3", () => {
  it("normalizes accents, casing and whitespace, and ranks exact, prefix, word and partial matches before pagination", async () => {
    const f = await createPublicSportsFixture();
    const query = { q: "  ÉLITE  ", type: "TEAM", limit: 2 };
    const first = await search(query); const second = await search({ ...query, page: 2 });
    expect(first.data.map((row) => row.id)).toEqual(f.teams.slice(0, 2).map((team) => team.id));
    expect(second.data.map((row) => row.id)).toEqual(f.teams.slice(2).map((team) => team.id));
    expect(first.pagination).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(first.counts).toMatchObject({ TEAM: 4, LEAGUE: 1, SEASON: 1, GAME_MATCH: 3, PLAYER: 0 });
    expect(await search({ ...query, q: "elite" })).toEqual(first);
    expect(await search(query)).toEqual(first);
    expect((await search({ ...query, page: 99 })).data).toEqual([]);
  });

  it("searches the five category fields and exposes immutable match links without internal match IDs", async () => {
    const f = await createPublicSportsFixture();
    expect((await search({ q: "eleonore martin", type: "PLAYER" })).data.map((row) => row.id)).toEqual([f.players[0].id]);
    expect((await search({ q: "attaquante", type: "PLAYER" })).data.map((row) => row.id)).toEqual([f.players[0].id]);
    expect((await search({ q: "belgique", type: "PLAYER" })).data.map((row) => row.id)).toEqual([f.players[1].id]);
    expect((await search({ q: "france", type: "LEAGUE" })).data.map((row) => row.id)).toEqual([f.league.id]);
    expect((await search({ q: "lumieres", type: "TEAM" })).data).toHaveLength(4);
    expect((await search({ q: "feminine", type: "SEASON" })).data.map((row) => row.id)).toEqual([f.season.id]);
    const matches = await search({ q: "racing", type: "GAME_MATCH" });
    expect(matches.data).toHaveLength(3);
    expect(matches.data.every((row) => f.matches.some((match) => row.id === match.matchPublicId))).toBe(true);
    expect(JSON.stringify(matches)).not.toContain(f.matches[0].id);
  });

  it("applies league, season, team, date and status filters before totals and category grouping", async () => {
    const f = await createPublicSportsFixture();
    const filtered = await search({ q: "elite", leagueId: f.league.id, seasonId: f.season.id, teamId: f.teams[1].id, dateFrom: "2026-10-11", dateTo: "2026-10-11", status: "COMPLETED" });
    expect(filtered.data.map((row) => row.id)).toEqual([f.matches[1].matchPublicId]);
    expect(filtered.pagination.total).toBe(1);
    expect(filtered.counts).toEqual({ LEAGUE: 0, TEAM: 0, PLAYER: 0, SEASON: 0, GAME_MATCH: 1 });
    const other = await prisma.league.create({ data: { name: "Élite autre", country: "France", isActive: true } });
    await prisma.leagueSeason.create({ data: { leagueId: other.id, seasonId: f.season.id } });
    expect((await search({ q: "elite", type: "SEASON", leagueId: other.id })).data).toHaveLength(1);
    expect((await search({ q: "elite", type: "TEAM", leagueId: other.id })).data).toEqual([]);
  });

  it("excludes hidden resources and their counts, including future and past player assignments", async () => {
    const f = await createPublicSportsFixture();
    const today = assignmentDate();
    await prisma.teamPlayer.updateMany({ where: { playerId: f.players[0].id }, data: { joinedAt: new Date(today.getTime() + 86_400_000) } });
    expect((await search({ q: "eleonore" })).pagination.total).toBe(0);
    await prisma.teamPlayer.updateMany({ where: { playerId: f.players[1].id }, data: { joinedAt: new Date("2020-01-01"), leftAt: new Date(today.getTime() - 86_400_000) } });
    expect((await search({ q: "louise" })).pagination.total).toBe(0);
    await prisma.team.update({ where: { id: f.teams[0].id }, data: { isActive: false } });
    expect((await search({ q: "elite", type: "GAME_MATCH" })).pagination.total).toBe(0);
    await prisma.league.update({ where: { id: f.league.id }, data: { isActive: false } });
    const hidden = await search({ q: "elite" });
    expect(hidden.counts).toEqual({ LEAGUE: 0, TEAM: 3, PLAYER: 0, SEASON: 0, GAME_MATCH: 0 });
    expect(hidden.data.every((row) => row.type === "TEAM")).toBe(true);
  });

  it("never searches drafts, even for an administrator token, and treats SQL metacharacters literally", async () => {
    const f = await createPublicSportsFixture();
    await prisma.gameMatch.update({ where: { id: f.matches[0].id }, data: { isPublished: false, status: "SCHEDULED", homeScore: null, awayScore: null } });
    const anonymous = await search({ q: "elite", type: "GAME_MATCH" });
    expect(anonymous.data).toHaveLength(2);
    const admin = await createAdmin();
    const response = await request(app).get(base).query({ q: "elite", type: "GAME_MATCH" }).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    expect(response.body).toEqual(anonymous);
    expect((await search({ q: "%' OR 1=1; --" })).pagination.total).toBe(0);
    expect(await prisma.league.count()).toBe(1);
    expect((await search()).pagination.total).toBe(0);
    for (const query of [{ q: "x" }, { q: "elite", limit: 51 }, { q: "elite", type: "STAFF" }, { q: "elite", isActive: false }, { q: "elite", dateFrom: "2026-10-12", dateTo: "2026-10-11" }]) {
      await request(app).get(base).query(query).expect(400);
    }
  });
});
