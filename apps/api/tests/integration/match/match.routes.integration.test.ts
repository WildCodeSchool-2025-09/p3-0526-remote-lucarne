import { randomUUID } from "node:crypto";
import type { AdminMatch, ApiErrorResponse, PaginatedAdminMatchesResponse } from "@lucarne/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";
import { createSeasonForLeague } from "../../helpers/season";

const base = "/api/v1/admin/matches";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const fixture = async () => {
  const admin = await createAdmin();
  const league = await prisma.league.create({ data: { name: `MATCH ${randomUUID()}`, country: "France" } });
  const season = await createSeasonForLeague(league.id);
  const days = await Promise.all([1, 2].map((number) => prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number } })));
  const teams = await Promise.all(["A", "B", "C"].map((name) => prisma.team.create({ data: { name } })));
  await prisma.participation.createMany({ data: teams.map((team) => ({ teamId: team.id, leagueSeasonId: season.leagueSeasonId })) });
  const slot = await prisma.gameMatch.create({ data: { matchdayId: days[0].id } });
  const headers = auth(admin.accessToken);
  const complete = { homeTeamId: teams[0].id, awayTeamId: teams[1].id, matchDate: "2026-10-25", startTime: "02:30", stadium: null };
  return { admin, league, season, days, teams, slot, headers, complete };
};
const expectError = (response: { status: number; body: { error: { code: string } } }, status: number, code: string) => {
  expect(response.status).toBe(status);
  expect(response.body.error.code).toBe(code);
};

describe("MATCH admin HTTP API", () => {
  it("creates, prepares, publishes, completes directly, corrects and deletes while preserving history", async () => {
    const { headers, days, teams, season, complete } = await fixture();
    const created = await request(app).post(base).set(headers).send({ matchdayId: days[0].id }).expect(201);
    let match = created.body as AdminMatch;
    expect(match).toMatchObject({ version: 0, isPublished: false, isActive: true, status: "SCHEDULED", matchDate: null, startTime: null, timeZone: "Europe/Paris", result: { homeScore: null, awayScore: null } });
    expect(match.matchPublicId).not.toBe(match.id);
    const mutate = async (suffix: string, input: object) => {
      const response = await request(app).patch(`${base}/${match.id}${suffix}`).set(headers).send({ version: match.version, ...input }).expect(200);
      expect((response.body as AdminMatch).version).toBe(match.version + 1);
      expect((response.body as AdminMatch).matchPublicId).toBe(match.matchPublicId);
      match = response.body as AdminMatch;
    };
    await mutate("", complete);
    expect(match).toMatchObject({ ...complete, leagueSeasonId: season.leagueSeasonId, result: { homeScore: null, awayScore: null } });
    await mutate("/publication", {});
    expect(match.isPublished).toBe(true);
    await mutate("/result", { homeScore: 0, awayScore: 0 });
    await mutate("/status", { status: "COMPLETED" });
    await mutate("/result", { homeScore: 2, awayScore: 0 });
    expect(match).toMatchObject({ status: "COMPLETED", result: { homeScore: 2, awayScore: 0 } });
    await mutate("", { matchdayId: days[1].id, awayTeamId: teams[2].id, matchDate: "2027-03-28", startTime: "02:30", stadium: "Terrain" });
    await mutate("/status", { status: "IN_PROGRESS" });
    await mutate("/status", { status: "SCHEDULED" });
    await mutate("/status", { status: "COMPLETED" });
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: teams[0].id, leagueSeasonId: season.leagueSeasonId } }, data: { status: "WITHDRAWN" } });
    await mutate("/result", { homeScore: 3, awayScore: 1 });
    await mutate("", { stadium: "Correction après retrait" });
    const player = await prisma.player.create({ data: { firstName: "Test", lastName: "Player" } });
    const event = await prisma.matchEvent.create({ data: { matchId: match.id, playerId: player.id, minute: 10 } });
    await request(app).get(`${base}/${match.id}`).set(headers).expect(200);
    await request(app).delete(`${base}/${match.id}`).set(headers).send({ version: match.version }).expect(204);
    expect(await prisma.gameMatch.findUnique({ where: { id: match.id } })).toMatchObject({ isActive: false, status: "COMPLETED", homeScore: 3, awayScore: 1, version: match.version + 1 });
    expect(await prisma.matchTeamReservation.count({ where: { matchId: match.id } })).toBe(0);
    expect(await prisma.matchEvent.findUnique({ where: { id: event.id } })).toEqual(event);
    await request(app).get(`${base}/${match.id}`).set(headers).expect(404);
    const list = await request(app).get(base).set(headers).expect(200);
    expect((list.body as PaginatedAdminMatchesResponse).data.some((item) => item.id === match.id)).toBe(false);
  });

  it.each([["ADMIN", createAdmin, 200], ["EDITOR", createEditor, 200], ["MODERATOR", createModerator, 200], ["USER", createUser, 403]] as const)("checks %s dashboard read rights", async (_role, createActor, status) => {
    const { slot } = await fixture(); const actor = await createActor();
    await request(app).get(base).set(auth(actor.accessToken)).expect(status);
    await request(app).get(`${base}/${slot.id}`).set(auth(actor.accessToken)).expect(status);
  });

  it.each([["EDITOR", createEditor], ["MODERATOR", createModerator], ["USER", createUser]] as const)("rejects every %s write", async (_role, createActor) => {
    const { slot, days, complete } = await fixture(); const actor = await createActor(); const headers = auth(actor.accessToken);
    await request(app).post(base).set(headers).send({ matchdayId: days[0].id }).expect(403);
    for (const [suffix, values] of [["", complete], ["/publication", {}], ["/status", { status: "IN_PROGRESS" }], ["/result", { homeScore: 0, awayScore: 0 }]] as const) {
      await request(app).patch(`${base}/${slot.id}${suffix}`).set(headers).send({ version: 0, ...values }).expect(403);
    }
    await request(app).delete(`${base}/${slot.id}`).set(headers).send({ version: 0 }).expect(403);
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toEqual(slot);
    expect(await prisma.gameMatch.count()).toBe(1);
  });

  it("requires authentication on every endpoint", async () => {
    const { slot, days, complete } = await fixture();
    await request(app).get(base).expect(401);
    await request(app).get(`${base}/${slot.id}`).expect(401);
    await request(app).post(base).send({ matchdayId: days[0].id }).expect(401);
    for (const [suffix, values] of [["", complete], ["/publication", {}], ["/status", { status: "IN_PROGRESS" }], ["/result", { homeScore: 0, awayScore: 0 }]] as const) {
      await request(app).patch(`${base}/${slot.id}${suffix}`).send({ version: 0, ...values }).expect(401);
    }
    await request(app).delete(`${base}/${slot.id}`).send({ version: 0 }).expect(401);
  });

  it("rejects incomplete publication, unpublished sports edits and completion without scores atomically", async () => {
    const { slot, headers, complete } = await fixture(); const url = `${base}/${slot.id}`;
    expectError(await request(app).patch(`${url}/publication`).set(headers).send({ version: 0 }), 409, "MATCH_PUBLICATION_INCOMPLETE");
    expectError(await request(app).patch(`${url}/status`).set(headers).send({ version: 0, status: "IN_PROGRESS" }), 409, "MATCH_STATUS_TRANSITION_FORBIDDEN");
    expectError(await request(app).patch(`${url}/result`).set(headers).send({ version: 0, homeScore: 0, awayScore: 0 }), 409, "MATCH_STATUS_TRANSITION_FORBIDDEN");
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toEqual(slot);
    await request(app).patch(url).set(headers).send({ version: 0, ...complete }).expect(200);
    await request(app).patch(`${url}/publication`).set(headers).send({ version: 1 }).expect(200);
    const before = await prisma.gameMatch.findUnique({ where: { id: slot.id } });
    expectError(await request(app).patch(`${url}/status`).set(headers).send({ version: 2, status: "COMPLETED" }), 409, "MATCH_RESULT_REQUIRED");
    expectError(await request(app).patch(url).set(headers).send({ version: 2, matchDate: null }), 409, "MATCH_PUBLICATION_INCOMPLETE");
    expectError(await request(app).patch(url).set(headers).send({ version: 2, awayTeamId: complete.homeTeamId }), 400, "VALIDATION_ERROR");
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toEqual(before);
  });

  it("checks registrations, duplicate teams and same-edition moves with controlled SQL errors", async () => {
    const { slot, headers, teams, days, league } = await fixture(); const url = `${base}/${slot.id}`;
    await request(app).patch(url).set(headers).send({ version: 0, homeTeamId: teams[0].id }).expect(200);
    const other = await prisma.gameMatch.create({ data: { matchdayId: days[0].id } });
    expectError(await request(app).patch(`${base}/${other.id}`).set(headers).send({ version: 0, awayTeamId: teams[0].id }), 409, "MATCH_TEAM_MATCHDAY_CONFLICT");
    const outsider = await prisma.team.create({ data: { name: "Unregistered" } });
    expectError(await request(app).patch(url).set(headers).send({ version: 1, awayTeamId: outsider.id }), 409, "MATCH_TEAM_NOT_REGISTERED");
    expectError(await request(app).patch(url).set(headers).send({ version: 1, homeTeamId: randomUUID() }), 409, "MATCH_TEAM_NOT_REGISTERED");
    const foreignSeason = await createSeasonForLeague(league.id);
    const foreignDay = await prisma.matchday.create({ data: { leagueSeasonId: foreignSeason.leagueSeasonId, number: 1 } });
    expectError(await request(app).patch(url).set(headers).send({ version: 1, matchdayId: foreignDay.id }), 409, "MATCH_EDITION_CHANGE_FORBIDDEN");
    await request(app).patch(url).set(headers).send({ version: 1, matchdayId: days[1].id }).expect(200);
    await request(app).patch(`${base}/${other.id}`).set(headers).send({ version: 0, awayTeamId: teams[0].id }).expect(200);
  });

  it("rechecks registration at publication and allows clearing a partial slot", async () => {
    const { slot, headers, complete, teams, season } = await fixture(); const url = `${base}/${slot.id}`;
    await request(app).patch(url).set(headers).send({ version: 0, ...complete }).expect(200);
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: teams[1].id, leagueSeasonId: season.leagueSeasonId } }, data: { status: "WITHDRAWN" } });
    expectError(await request(app).patch(`${url}/publication`).set(headers).send({ version: 1 }), 409, "MATCH_TEAM_NOT_REGISTERED");
    const cleared = await request(app).patch(url).set(headers).send({ version: 1, awayTeamId: null, matchDate: null, startTime: null }).expect(200);
    expect(cleared.body).toMatchObject({ version: 2, homeTeamId: teams[0].id, awayTeamId: null, matchDate: null, startTime: null });
  });

  it.each(["", "/publication", "/status", "/result", "delete"])("rejects stale versions on %s", async (suffix) => {
    const { slot, headers, complete } = await fixture(); const url = `${base}/${slot.id}`;
    await request(app).patch(url).set(headers).send({ version: 0, ...complete }).expect(200);
    const input = { version: 0, ...(suffix === "" ? { stadium: "Stale" } : suffix === "/status" ? { status: "IN_PROGRESS" } : suffix === "/result" ? { homeScore: 1, awayScore: 0 } : {}) };
    const response = suffix === "delete" ? await request(app).delete(url).set(headers).send(input) : await request(app).patch(`${url}${suffix}`).set(headers).send(input);
    expectError(response, 409, "RESOURCE_VERSION_CONFLICT");
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toMatchObject({ version: 1, isActive: true, isPublished: false, stadium: null });
  });

  it("serializes concurrent changes to the same version", async () => {
    const { slot, headers } = await fixture();
    const responses = await Promise.all(["First", "Second"].map((stadium) => request(app).patch(`${base}/${slot.id}`).set(headers).send({ version: 0, stadium })));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const winner = responses.find((response) => response.status === 200)!;
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toMatchObject({ version: 1, stadium: (winner.body as AdminMatch).stadium });
    expect((responses.find((response) => response.status === 409)!.body as ApiErrorResponse).error.code).toBe("RESOURCE_VERSION_CONFLICT");
  });

  it("arbitrates concurrent cross-side assignments on different slots", async () => {
    const { slot, headers, teams, days } = await fixture();
    const other = await prisma.gameMatch.create({ data: { matchdayId: days[0].id } });
    const responses = await Promise.all([
      request(app).patch(`${base}/${slot.id}`).set(headers).send({ version: 0, homeTeamId: teams[0].id }),
      request(app).patch(`${base}/${other.id}`).set(headers).send({ version: 0, awayTeamId: teams[0].id }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((responses.find((response) => response.status === 409)!.body as ApiErrorResponse).error.code).toBe("MATCH_TEAM_MATCHDAY_CONFLICT");
    expect(await prisma.matchTeamReservation.count()).toBe(1);
    expect((await prisma.gameMatch.findMany()).map((match) => match.version).sort()).toEqual([0, 1]);
  });

  it("returns 404 for missing matches/days and validates IDs, payloads and forbidden flags", async () => {
    const { headers, slot } = await fixture();
    await request(app).get(`${base}/${randomUUID()}`).set(headers).expect(404);
    await request(app).get(`${base}/invalid`).set(headers).expect(400);
    expectError(await request(app).post(base).set(headers).send({ matchdayId: randomUUID() }), 404, "RESOURCE_NOT_FOUND");
    expectError(await request(app).patch(`${base}/${slot.id}`).set(headers).send({ version: 0, matchdayId: randomUUID() }), 404, "RESOURCE_NOT_FOUND");
    for (const input of [{ stadium: "Missing version" }, { version: 0 }, { version: 0, isPublished: true }, { version: 0, status: "COMPLETED" }, { version: 0, matchPublicId: randomUUID() }, { version: 0, startTime: "24:00" }, { version: 0, matchDate: "2026-02-30" }]) {
      await request(app).patch(`${base}/${slot.id}`).set(headers).send(input).expect(400);
    }
    await request(app).patch(`${base}/${slot.id}/result`).set(headers).send({ version: 0, homeScore: -1, awayScore: 0 }).expect(400);
    await request(app).patch(`${base}/${slot.id}/status`).set(headers).send({ version: 0, status: "POSTPONED" }).expect(400);
    await request(app).delete(`${base}/${slot.id}`).set(headers).send({}).expect(400);
    expect(await prisma.gameMatch.findUnique({ where: { id: slot.id } })).toEqual(slot);
  });

  it("combines filters with inclusive civil dates, stable pagination and nulls last", async () => {
    const { headers, slot, complete, days, league, season, teams } = await fixture();
    await request(app).patch(`${base}/${slot.id}`).set(headers).send({ version: 0, ...complete }).expect(200);
    await request(app).patch(`${base}/${slot.id}/publication`).set(headers).send({ version: 1 }).expect(200);
    await request(app).patch(`${base}/${slot.id}/status`).set(headers).send({ version: 2, status: "IN_PROGRESS" }).expect(200);
    await prisma.gameMatch.createMany({ data: Array.from({ length: 24 }, (_, index) => ({ matchdayId: days[1].id, ...(index < 2 ? { matchDate: new Date(index === 0 ? "2026-10-24" : "2026-10-26"), startTime: new Date("1970-01-01T20:00:00Z") } : {}) })) });
    await prisma.gameMatch.create({ data: { matchdayId: days[1].id, isActive: false } });
    const firstResponse = await request(app).get(base).set(headers).expect(200);
    const first = { body: firstResponse.body as PaginatedAdminMatchesResponse };
    expect(first.body.pagination).toEqual({ page: 1, pageSize: 20, totalItems: 25, totalPages: 2 });
    expect(first.body.data[1].id).toBe(slot.id);
    const secondResponse = await request(app).get(base).query({ page: 2 }).set(headers).expect(200);
    const second = { body: secondResponse.body as PaginatedAdminMatchesResponse };
    expect(second.body.data).toHaveLength(5);
    expect(new Set([...first.body.data, ...second.body.data].map((match: AdminMatch) => match.id)).size).toBe(25);
    const descendingResponse = await request(app).get(base).query({ sortOrder: "desc" }).set(headers).expect(200);
    const descending = { body: descendingResponse.body as PaginatedAdminMatchesResponse };
    expect(descending.body.data.slice(0, 3).map((match: AdminMatch) => match.matchDate)).toEqual(["2026-10-26", "2026-10-25", "2026-10-24"]);
    expect(descending.body.data[3].matchDate).toBeNull();
    const filteredResponse = await request(app).get(base).query({ leagueId: league.id, seasonId: season.id, matchdayId: days[0].id, teamId: teams[1].id, status: "IN_PROGRESS", dateFrom: complete.matchDate, dateTo: complete.matchDate }).set(headers).expect(200);
    const filtered = { body: filteredResponse.body as PaginatedAdminMatchesResponse };
    expect(filtered.body.data.map((match: AdminMatch) => match.id)).toEqual([slot.id]);
    expect(filtered.body.pagination.totalItems).toBe(1);
    for (const query of [{ teamId: teams[2].id }, { leagueId: randomUUID() }, { seasonId: randomUUID() }, { status: "COMPLETED" }, { dateFrom: "2026-10-27" }]) {
      const response = await request(app).get(base).query(query).set(headers).expect(200);
      expect((response.body as PaginatedAdminMatchesResponse).data).toEqual([]);
    }
    for (const query of [{ isPublished: false }, { pageSize: 100 }, { dateFrom: "2026-10-26", dateTo: "2026-10-24" }, { teamId: "invalid" }]) {
      await request(app).get(base).query(query).set(headers).expect(400);
    }
  });
});
