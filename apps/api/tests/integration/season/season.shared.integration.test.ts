import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { PaginatedLeagueSeasonsResponse, SeasonDetail } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin } from "../../helpers/auth";
import { createSeasonForLeague } from "../../helpers/season";

const fixture = async () => {
  const firstLeague = await prisma.league.create({ data: { name: `First ${randomUUID()}`, country: "France" } });
  const secondLeague = await prisma.league.create({ data: { name: `Second ${randomUUID()}`, country: "France" } });
  const season = await createSeasonForLeague(firstLeague.id);
  const secondEdition = await prisma.leagueSeason.create({ data: { leagueId: secondLeague.id, seasonId: season.id } });
  return { firstLeague, secondLeague, season, secondEdition };
};

describe("shared seasons", () => {
  it("lists only editions of the requested league with that league's current status", async () => {
    const admin = await createAdmin();
    const { firstLeague, secondLeague, season, secondEdition } = await fixture();
    await prisma.leagueSeason.update({ where: { id: season.leagueSeasonId }, data: { isCurrent: true } });
    const exclusive = await createSeasonForLeague(secondLeague.id);
    const first = await request(app).get(`/api/v1/leagues/${firstLeague.id}/seasons`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    const firstData = (first.body as PaginatedLeagueSeasonsResponse).data;
    expect(firstData).toHaveLength(1);
    expect(firstData[0]).toMatchObject({ leagueId: firstLeague.id, seasonId: season.id, isCurrent: true });
    const second = await request(app).get(`/api/v1/leagues/${secondLeague.id}/seasons`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    const secondData = (second.body as PaginatedLeagueSeasonsResponse).data;
    expect(secondData).toHaveLength(2);
    expect(secondData.every((edition) => edition.leagueId === secondLeague.id)).toBe(true);
    expect(secondData).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: secondEdition.id, seasonId: season.id, isCurrent: false }),
      expect.objectContaining({ seasonId: exclusive.id }),
    ]));
  });

  it("changes the current season for one league without changing the other league or the global version", async () => {
    const user = await createAdmin();
    const { firstLeague, secondLeague, season, secondEdition } = await fixture();
    await prisma.leagueSeason.update({ where: { id: secondEdition.id }, data: { isCurrent: true } });
    const otherSeason = await createSeasonForLeague(firstLeague.id);
    await request(app).patch(`/api/v1/leagues/${firstLeague.id}/seasons/${season.id}/current`)
      .set("Authorization", `Bearer ${user.accessToken}`).expect(200);
    await request(app).patch(`/api/v1/leagues/${firstLeague.id}/seasons/${otherSeason.id}/current`)
      .set("Authorization", `Bearer ${user.accessToken}`).expect(200);
    await expect(prisma.leagueSeason.findUnique({ where: { id: secondEdition.id } })).resolves.toMatchObject({ leagueId: secondLeague.id, isCurrent: true });
    await expect(prisma.leagueSeason.findUnique({ where: { id: season.leagueSeasonId } })).resolves.toMatchObject({ isCurrent: false });
    await expect(prisma.season.findUnique({ where: { id: season.id } })).resolves.toMatchObject({ version: 0 });
  });

  it("keeps participation and scheduled-match counts separate for each edition", async () => {
    const user = await createAdmin();
    const { season, secondEdition } = await fixture();
    const home = await prisma.team.create({ data: { name: "Shared team" } });
    const away = await prisma.team.create({ data: { name: "Opponent" } });
    await prisma.participation.createMany({ data: [
      { teamId: home.id, leagueSeasonId: season.leagueSeasonId, points: 7 },
      { teamId: home.id, leagueSeasonId: secondEdition.id, points: 2 },
      { teamId: away.id, leagueSeasonId: secondEdition.id },
    ] });
    const matchday = await prisma.matchday.create({ data: { leagueSeasonId: secondEdition.id, number: 1 } });
    await prisma.gameMatch.create({ data: {
      matchdayId: matchday.id, homeTeamId: home.id, awayTeamId: away.id,
      matchDate: new Date("2026-09-01"), startTime: new Date("1970-01-01T14:00:00Z"),
    } });
    await request(app).delete(`/api/v1/league-seasons/${season.leagueSeasonId}/participations/${home.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`).expect(200);
    const response = await request(app).get(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`).expect(200);
    const detail = response.body as SeasonDetail;
    expect(detail.leagueSeasons).toHaveLength(2);
    expect(detail.leagueSeasons.find((edition) => edition.id === season.leagueSeasonId)?.participatingTeams)
      .toEqual([expect.objectContaining({ id: home.id, status: "WITHDRAWN", points: 7, scheduledMatchCount: 0 })]);
    expect(detail.leagueSeasons.find((edition) => edition.id === secondEdition.id)?.participatingTeams)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: home.id, status: "REGISTERED", points: 2, scheduledMatchCount: 1 })]));
  });

  it("checks period changes against every league edition and validates a single changed date", async () => {
    const user = await createAdmin();
    const { season, secondEdition } = await fixture();
    await prisma.matchday.create({ data: {
      leagueSeasonId: secondEdition.id, number: 1,
      startDate: new Date("2026-09-01"), endDate: new Date("2026-09-02"),
    } });
    const update = (body: object) => request(app).patch(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`).send(body);
    const conflict = await update({ version: 0, endDate: "2026-08-31" }).expect(409);
    expect(conflict.body).toMatchObject({ error: { code: "SEASON_PERIOD_CONFLICT" } });
    await update({ version: 0, startDate: "2028-01-01" }).expect(400);
    await expect(prisma.season.findUnique({ where: { id: season.id } })).resolves.toMatchObject({ version: 0 });
  });
});
