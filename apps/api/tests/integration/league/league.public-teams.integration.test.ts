import type { PublicLeagueTeamsResponse } from "@lucarne/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createSeasonForLeague } from "../../helpers/season";

async function fixture() {
  const league = await prisma.league.create({ data: { name: "Public teams", country: "France", isActive: true } });
  const current = await createSeasonForLeague(league.id, "Current");
  const previous = await createSeasonForLeague(league.id, "Previous");
  return { league, current, previous };
}

const path = (slug: string, seasonId: string) => `/api/v1/leagues/by-slug/${slug}/seasons/${seasonId}/teams`;
async function read(slug: string, seasonId: string, page = 1) {
  const response = await request(app).get(path(slug, seasonId)).query({ page, pageSize: 20 }).expect(200);
  return response.body as PublicLeagueTeamsResponse;
}

describe("Public league teams", () => {
  it("lists only active registered participants, including teams without matches, across every page", async () => {
    const { league, current, previous } = await fixture();
    const visible = await prisma.team.createManyAndReturn({ data: Array.from({ length: 23 }, (_, index) => ({
      name: `Club ${String(index === 4 ? 3 : index).padStart(2, "0")}`,
      logoUrl: index === 0 ? "/api/v1/uploads/photos/team.png" : null,
    })) });
    await prisma.participation.createMany({ data: visible.map((team) => ({ teamId: team.id, leagueSeasonId: current.leagueSeasonId })) });
    const inactive = await prisma.team.create({ data: { name: "Inactive registered" } });
    const withdrawn = await prisma.team.create({ data: { name: "Active withdrawn" } });
    const archived = await prisma.team.create({ data: { name: "Previous only" } });
    await prisma.participation.createMany({ data: [
      { teamId: inactive.id, leagueSeasonId: current.leagueSeasonId },
      { teamId: inactive.id, leagueSeasonId: previous.leagueSeasonId },
      { teamId: withdrawn.id, leagueSeasonId: current.leagueSeasonId, status: "WITHDRAWN" },
      { teamId: archived.id, leagueSeasonId: previous.leagueSeasonId },
    ] });
    await prisma.team.update({ where: { id: inactive.id }, data: { isActive: false } });
    const other = await prisma.league.create({ data: { name: "Other league", country: "France", isActive: true } });
    const otherEdition = await prisma.leagueSeason.create({ data: { leagueId: other.id, seasonId: current.id } });
    await prisma.participation.create({ data: { teamId: archived.id, leagueSeasonId: otherEdition.id } });

    const expected = await prisma.team.findMany({
      where: { id: { in: visible.map((team) => team.id) } },
      orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, logoUrl: true },
    });
    const first = await read(league.slug, current.id);
    const second = await read(league.slug, current.id, 2);
    expect(first.pagination).toEqual({ page: 1, pageSize: 20, totalItems: 23, totalPages: 2 });
    expect(first.data).toEqual(expected.slice(0, 20));
    expect(second.data).toEqual(expected.slice(20));
    expect(new Set([...first.data, ...second.data].map((team) => team.id)).size).toBe(23);
    expect(await read(league.slug, current.id)).toEqual(first);
    expect((await read(league.slug, current.id, 99)).data).toEqual([]);
    expect((await read(league.slug, previous.id)).data).toEqual([{ id: archived.id, name: archived.name, logoUrl: null }]);
    expect(await prisma.gameMatch.count()).toBe(0);
    await request(app).get("/api/v1/teams").expect(401);
  });

  it("returns an empty valid edition without authentication and ignores invalid credentials", async () => {
    const { league, current } = await fixture();
    const response = await request(app).get(path(league.slug, current.id)).set("Authorization", "Bearer invalid").expect(200);
    expect(response.body).toEqual({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  });

  it("immediately reflects deactivation and withdrawal in data and totals", async () => {
    const { league, current } = await fixture();
    const team = await prisma.team.create({ data: { name: "Participant" } });
    await prisma.participation.create({ data: { teamId: team.id, leagueSeasonId: current.leagueSeasonId } });
    expect((await read(league.slug, current.id)).pagination.totalItems).toBe(1);
    await prisma.team.update({ where: { id: team.id }, data: { isActive: false } });
    expect((await read(league.slug, current.id)).pagination.totalItems).toBe(0);
    await prisma.team.update({ where: { id: team.id }, data: { isActive: true } });
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: current.leagueSeasonId } }, data: { status: "WITHDRAWN" } });
    expect((await read(league.slug, current.id)).data).toEqual([]);
  });

  it("rejects an unrelated season and hides inactive or missing leagues", async () => {
    const { league, current } = await fixture();
    const other = await prisma.league.create({ data: { name: "Unrelated", country: "France", isActive: true } });
    const foreign = await createSeasonForLeague(other.id, "Foreign season");
    await request(app).get(path(league.slug, foreign.id)).expect(404);
    await request(app).get(path("missing", current.id)).expect(404);
    await prisma.league.update({ where: { id: league.id }, data: { isActive: false } });
    await request(app).get(path(league.slug, current.id)).expect(404);
  });

  it("rejects malformed identifiers and visibility or pagination overrides", async () => {
    const { league, current } = await fixture();
    await request(app).get(path("InvalidSlug", current.id)).expect(400);
    await request(app).get(path(league.slug, "invalid")).expect(400);
    for (const query of [{ page: 0 }, { pageSize: 100 }, { status: "ALL" }, { isActive: false }, { limit: 3 }]) {
      await request(app).get(path(league.slug, current.id)).query(query).expect(400);
    }
  });
});
