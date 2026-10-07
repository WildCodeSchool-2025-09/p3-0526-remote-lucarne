import { randomUUID } from "node:crypto";
import type { ApiErrorResponse, PaginatedPublicMatchesResponse, PublicMatch } from "@lucarne/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";
import { createSeasonForLeague } from "../../helpers/season";

const base = "/api/v1/matches";
const fixture = async () => {
  const league = await prisma.league.create({ data: { name: `Public league ${randomUUID()}`, country: "France" } });
  const season = await createSeasonForLeague(league.id);
  const teams = await Promise.all(["Home", "Away"].map((name) => prisma.team.create({ data: { name, logoUrl: name === "Home" ? "https://example.com/home.png" : null } })));
  await prisma.participation.createMany({ data: teams.map((team) => ({ teamId: team.id, leagueSeasonId: season.leagueSeasonId })) });
  const day = await prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number: 1, name: "Journée 1" } });
  const match = await prisma.gameMatch.create({ data: {
    matchdayId: day.id, homeTeamId: teams[0].id, awayTeamId: teams[1].id,
    matchDate: new Date("2026-10-25"), startTime: new Date("1970-01-01T02:30:00Z"), isPublished: true,
  } });
  return { league, season, teams, day, match };
};
const readList = async (query: Record<string, string | number | undefined> = {}) => {
  const response = await request(app).get(base).query(query).expect(200);
  return response.body as PaginatedPublicMatchesResponse;
};
const expectNotFound = async (publicId: string) => {
  const response = await request(app).get(`${base}/${publicId}`).expect(404);
  expect(response.body as ApiErrorResponse).toEqual({ error: { code: "RESOURCE_NOT_FOUND", message: "Match introuvable." } });
};

describe("MATCH public HTTP API", () => {
  it("returns only the public contract without authentication or internal identifiers", async () => {
    const { league, season, teams, match } = await fixture();
    const response = await request(app).get(`${base}/${match.matchPublicId}`).expect(200);
    const expected: PublicMatch = {
      matchPublicId: match.matchPublicId, league: { name: league.name, country: "France" }, season: { name: season.name },
      matchday: { number: 1, name: "Journée 1" },
      homeTeam: { name: teams[0].name, logoUrl: teams[0].logoUrl }, awayTeam: { name: teams[1].name, logoUrl: null },
      matchDate: "2026-10-25", startTime: "02:30", timeZone: "Europe/Paris", stadium: null,
      status: "SCHEDULED", result: { homeScore: null, awayScore: null },
    };
    expect(response.body).toEqual(expected);
    const list = await readList();
    expect(list).toEqual({ data: [expected], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    for (const id of [match.id, match.matchdayId, league.id, season.id, teams[0].id, teams[1].id]) {
      expect(JSON.stringify(list)).not.toContain(id);
    }
    await expectNotFound(match.id);
  });

  it.each([["ADMIN", createAdmin], ["MODERATOR", createModerator], ["EDITOR", createEditor], ["USER", createUser]] as const)("allows %s public reads with the same response", async (_role, createActor) => {
    const { match } = await fixture(); const actor = await createActor();
    await request(app).get(base).set("Authorization", `Bearer ${actor.accessToken}`).expect(200);
    await request(app).get(`${base}/${match.matchPublicId}`).set("Authorization", `Bearer ${actor.accessToken}`).expect(200);
  });

  it("hides incomplete and complete unpublished slots and deleted matches from data and totals", async () => {
    const { match, day } = await fixture();
    const blank = await prisma.gameMatch.create({ data: { matchdayId: day.id } });
    const otherDay = await prisma.matchday.create({ data: { leagueSeasonId: day.leagueSeasonId, number: 2 } });
    const prepared = await prisma.gameMatch.create({ data: {
      matchdayId: otherDay.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId,
      matchDate: match.matchDate, startTime: match.startTime,
    } });
    const deleted = await prisma.gameMatch.create({ data: {
      matchdayId: day.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId,
      matchDate: match.matchDate, startTime: match.startTime, isPublished: true, isActive: false,
    } });
    const list = await readList();
    expect(list.data.map((item) => item.matchPublicId)).toEqual([match.matchPublicId]);
    expect(list.pagination.totalItems).toBe(1);
    for (const publicId of [blank.matchPublicId, prepared.matchPublicId, deleted.matchPublicId, randomUUID()]) await expectNotFound(publicId);
    const filtered = await readList({ matchdayId: otherDay.id });
    expect(filtered).toEqual({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    const admin = await createAdmin();
    for (const publicId of [blank.matchPublicId, prepared.matchPublicId, deleted.matchPublicId]) {
      await request(app).get(`${base}/${publicId}`).set("Authorization", `Bearer ${admin.accessToken}`).expect(404);
    }
  });

  it("combines every filter, checks either team side and includes both date boundaries", async () => {
    const { match, league, season, day, teams } = await fixture();
    const other = await fixture();
    await prisma.gameMatch.update({ where: { id: match.id }, data: { status: "IN_PROGRESS" } });
    const filters = { leagueId: league.id, seasonId: season.id, matchdayId: day.id, teamId: teams[1].id, status: "IN_PROGRESS", dateFrom: "2026-10-25", dateTo: "2026-10-25" };
    expect((await readList(filters)).data.map((item) => item.matchPublicId)).toEqual([match.matchPublicId]);
    expect((await readList({ teamId: teams[0].id })).data.map((item) => item.matchPublicId)).toEqual([match.matchPublicId]);
    for (const filter of [
      { leagueId: league.id }, { seasonId: season.id }, { matchdayId: day.id },
      { status: "IN_PROGRESS" }, { leagueId: league.id, dateFrom: "2026-10-25" }, { leagueId: league.id, dateTo: "2026-10-25" },
    ]) expect((await readList(filter)).data.map((item) => item.matchPublicId)).toEqual([match.matchPublicId]);
    for (const filter of [
      { ...filters, leagueId: other.league.id }, { ...filters, seasonId: other.season.id },
      { ...filters, matchdayId: other.day.id }, { ...filters, teamId: other.teams[0].id },
      { ...filters, status: "COMPLETED" }, { dateFrom: "2026-10-26" }, { dateTo: "2026-10-24" },
    ]) expect((await readList(filter)).pagination.totalItems).toBe(0);
  });

  it("sorts chronologically with stable tie breaks and paginates only visible matches", async () => {
    const { match, day } = await fixture();
    const days = await Promise.all(Array.from({ length: 23 }, (_, index) => prisma.matchday.create({ data: { leagueSeasonId: day.leagueSeasonId, number: index + 2 } })));
    await prisma.gameMatch.createMany({ data: days.map((nextDay, index) => ({
      matchdayId: nextDay.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId,
      matchDate: new Date(index < 2 ? "2026-10-24" : "2026-10-26"),
      startTime: new Date(index === 0 ? "1970-01-01T18:00:00Z" : "1970-01-01T12:00:00Z"), isPublished: true,
    })) });
    await prisma.gameMatch.createMany({ data: Array.from({ length: 30 }, () => ({ matchdayId: day.id })) });
    const first = await readList(); const second = await readList({ page: 2 });
    expect(first.pagination).toEqual({ page: 1, pageSize: 20, totalItems: 24, totalPages: 2 });
    expect(first.data).toHaveLength(20); expect(second.data).toHaveLength(4);
    expect(first.data.slice(0, 3).map((item) => [item.matchDate, item.startTime])).toEqual([["2026-10-24", "12:00"], ["2026-10-24", "18:00"], ["2026-10-25", "02:30"]]);
    expect(new Set([...first.data, ...second.data].map((item) => item.matchPublicId)).size).toBe(24);
    expect(await readList()).toEqual(first);
    expect(await readList({ page: 2 })).toEqual(second);
    const descending = [...(await readList({ sortOrder: "desc" })).data, ...(await readList({ sortOrder: "desc", page: 2 })).data];
    expect(descending.slice(-3).map((item) => [item.matchDate, item.startTime])).toEqual([["2026-10-25", "02:30"], ["2026-10-24", "18:00"], ["2026-10-24", "12:00"]]);
    const ties = await prisma.gameMatch.findMany({ where: { isActive: true, isPublished: true, matchDate: new Date("2026-10-26") }, orderBy: { id: "asc" }, select: { matchPublicId: true } });
    expect([...first.data, ...second.data].slice(3).map((item) => item.matchPublicId)).toEqual(ties.map((item) => item.matchPublicId));
    expect((await readList({ page: 3 })).data).toEqual([]);
  });

  it("reflects publication, corrected zero scores, status, civil schedule and deletion immediately", async () => {
    const { match } = await fixture(); const admin = await createAdmin(); const headers = { Authorization: `Bearer ${admin.accessToken}` };
    await prisma.gameMatch.update({ where: { id: match.id }, data: { isPublished: false } });
    await expectNotFound(match.matchPublicId);
    await request(app).patch(`/api/v1/admin/matches/${match.id}/publication`).set(headers).send({ version: 0 }).expect(200);
    await request(app).patch(`/api/v1/admin/matches/${match.id}/result`).set(headers).send({ version: 1, homeScore: 0, awayScore: 0 }).expect(200);
    await request(app).patch(`/api/v1/admin/matches/${match.id}/status`).set(headers).send({ version: 2, status: "COMPLETED" }).expect(200);
    expect((await readList()).data[0]).toMatchObject({ status: "COMPLETED", result: { homeScore: 0, awayScore: 0 } });
    await request(app).patch(`/api/v1/admin/matches/${match.id}/result`).set(headers).send({ version: 3, homeScore: 1, awayScore: 0 }).expect(200);
    await request(app).patch(`/api/v1/admin/matches/${match.id}`).set(headers).send({ version: 4, matchDate: "2027-03-28", startTime: "02:30", stadium: "Terrain" }).expect(200);
    const detail = await request(app).get(`${base}/${match.matchPublicId}`).expect(200);
    expect(detail.body).toMatchObject({ status: "COMPLETED", result: { homeScore: 1, awayScore: 0 }, matchDate: "2027-03-28", startTime: "02:30", timeZone: "Europe/Paris", stadium: "Terrain" });
    expect((await readList()).data[0]).toEqual(detail.body);
    await request(app).delete(`/api/v1/admin/matches/${match.id}`).set(headers).send({ version: 5 }).expect(204);
    await expectNotFound(match.matchPublicId);
    expect((await readList()).pagination.totalItems).toBe(0);
  });

  it("validates public IDs and rejects visibility overrides and malformed filters", async () => {
    await fixture();
    await request(app).get(`${base}/invalid`).expect(400);
    for (const query of [
      { isPublished: "false" }, { isActive: "false" }, { includeDrafts: "true" }, { version: "0" },
      { page: "0" }, { pageSize: "100" }, { leagueId: "invalid" }, { seasonId: "invalid" },
      { matchdayId: "invalid" }, { teamId: "invalid" }, { status: "POSTPONED" },
      { dateFrom: "2026-02-30" }, { dateFrom: "2026-10-26", dateTo: "2026-10-24" }, { sortBy: "version" },
    ]) {
      const response = await request(app).get(base).query(query).expect(400);
      expect((response.body as ApiErrorResponse).error.code).toBe("VALIDATION_ERROR");
    }
    expect((await readList()).pagination.totalItems).toBe(1);
  });

  it("exposes no public mutation and keeps admin reads protected", async () => {
    const { match, day } = await fixture();
    await request(app).post(base).send({ matchdayId: day.id }).expect(404);
    await request(app).patch(`${base}/${match.matchPublicId}`).send({ version: 0, stadium: "Forbidden" }).expect(404);
    await request(app).delete(`${base}/${match.matchPublicId}`).send({ version: 0 }).expect(404);
    await request(app).get("/api/v1/admin/matches").expect(401);
    await request(app).get(`/api/v1/admin/matches/${match.id}`).expect(401);
    expect(await prisma.gameMatch.findUnique({ where: { id: match.id } })).toEqual(match);
  });
});
