import request from "supertest";
import { describe, expect, it } from "vitest";
import { publicMatchdayDetailSchema, publicPlayerListResponseSchema, publicPlayerProfileSchema, publicStaffProfileSchema, publicTeamDetailSchema, publicTeamListResponseSchema, publicTeamRosterSchema } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { assignmentDate } from "../../../src/utils/assignmentPeriod";
import { createSeasonForLeague } from "../../helpers/season";

const base = "/api/v1/public";
const tomorrow = (day: Date) => new Date(day.getTime() + 86_400_000);
const yesterday = (day: Date) => new Date(day.getTime() - 86_400_000);
async function fixture() {
  const league = await prisma.league.create({ data: { name: "Public portal", country: "France", isActive: true } });
  const season = await createSeasonForLeague(league.id, "Public season");
  const team = await prisma.team.create({ data: { name: "Club public", stadium: "Stade public" } });
  await prisma.participation.create({ data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } });
  return { league, season, team };
}

describe("Public portal B1 with PostgreSQL", () => {
  it("deduplicates teams across editions, combines filters and excludes withdrawn or inactive participants", async () => {
    const { league, season, team } = await fixture();
    const previous = await createSeasonForLeague(league.id, "Previous");
    await prisma.participation.create({ data: { teamId: team.id, leagueSeasonId: previous.leagueSeasonId } });
    const inactive = await prisma.team.create({ data: { name: "Inactive" } });
    const withdrawn = await prisma.team.create({ data: { name: "Withdrawn" } });
    await prisma.participation.createMany({ data: [
      { teamId: inactive.id, leagueSeasonId: season.leagueSeasonId },
      { teamId: withdrawn.id, leagueSeasonId: season.leagueSeasonId, status: "WITHDRAWN" },
    ] });
    await prisma.team.update({ where: { id: inactive.id }, data: { isActive: false } });
    const first = await request(app).get(`${base}/teams`).query({ leagueId: league.id, seasonId: season.id, search: "PUBLIC", limit: 1 }).expect(200);
    const firstBody = publicTeamListResponseSchema.parse(first.body);
    expect(firstBody.data).toEqual([{ id: team.id, name: team.name, logoUrl: null, stadium: team.stadium }]);
    expect(firstBody.pagination).toEqual({ page: 1, limit: 1, total: 1, totalPages: 1 });
    const second = await request(app).get(`${base}/teams`).query({ leagueId: league.id, limit: 1, page: 2 }).expect(200);
    const secondBody = publicTeamListResponseSchema.parse(second.body);
    expect(secondBody.data).toEqual([]);
    expect(secondBody.pagination.total).toBe(1);
    const detail = await request(app).get(`${base}/teams/${team.id}`).expect(200);
    expect(publicTeamDetailSchema.parse(detail.body).editions).toHaveLength(2);
  });

  it("uses inclusive current assignment boundaries and never exposes inactive, past, future or unassigned people", async () => {
    const { team } = await fixture();
    const today = assignmentDate();
    const visibleIds: string[] = [];
    const hiddenIds: string[] = [];
    for (const kind of ["starts-today", "ends-today", "past", "future", "inactive", "unassigned"] as const) {
      const player = await prisma.player.create({ data: { firstName: "Alex", lastName: kind, isActive: kind !== "inactive" } });
      if (kind !== "unassigned") await prisma.teamPlayer.create({ data: {
        teamId: team.id, playerId: player.id, shirtNumber: 7,
        joinedAt: kind === "future" ? tomorrow(today) : kind === "starts-today" ? today : new Date("2020-01-01"),
        leftAt: kind === "past" ? yesterday(today) : kind === "ends-today" ? today : null,
      } });
      if (kind === "starts-today" || kind === "ends-today") visibleIds.push(player.id); else hiddenIds.push(player.id);
    }
    const member = await prisma.staffMember.create({ data: { firstName: "Sam", lastName: "Coach", nationality: "France" } });
    await prisma.teamStaffMember.create({ data: { teamId: team.id, staffMemberId: member.id, jobTitle: "Coach", joinedAt: today } });
    const hiddenStaffIds: string[] = [];
    for (const kind of ["past", "future", "inactive"] as const) {
      const hidden = await prisma.staffMember.create({ data: { firstName: "Hidden", lastName: kind, nationality: "France", isActive: kind !== "inactive" } });
      await prisma.teamStaffMember.create({ data: { teamId: team.id, staffMemberId: hidden.id, jobTitle: "Coach",
        joinedAt: kind === "future" ? tomorrow(today) : new Date("2020-01-01"), leftAt: kind === "past" ? yesterday(today) : null,
      } });
      hiddenStaffIds.push(hidden.id);
    }
    const rosterResponse = await request(app).get(`${base}/teams/${team.id}/roster`).expect(200);
    const roster = publicTeamRosterSchema.parse(rosterResponse.body);
    expect(roster.date).toBe(today.toISOString().slice(0, 10));
    expect(roster.players.map((player) => player.id).sort()).toEqual(visibleIds.sort());
    expect(roster.staffMembers.map((staff) => staff.id)).toEqual([member.id]);
    for (const id of hiddenIds) await request(app).get(`${base}/players/${id}`).expect(404);
    for (const id of hiddenStaffIds) await request(app).get(`${base}/staff-members/${id}`).expect(404);
    const response = await request(app).get(`${base}/players/${visibleIds[0]}`).expect(200);
    expect(publicPlayerProfileSchema.parse(response.body)).toMatchObject({ shirtNumber: 7, team: { id: team.id } });
    expect(response.body).not.toHaveProperty("birthDate");
    expect(response.body).not.toHaveProperty("teamPlayers");
    const list = await request(app).get(`${base}/players`).query({ teamId: team.id, search: "Alex today" }).expect(200);
    expect(publicPlayerListResponseSchema.parse(list.body).pagination.total).toBe(2);
    const staffResponse = await request(app).get(`${base}/staff-members/${member.id}`).expect(200);
    expect(publicStaffProfileSchema.parse(staffResponse.body).jobTitle).toBe("Coach");
    await prisma.team.update({ where: { id: team.id }, data: { isActive: false } });
    await request(app).get(`${base}/teams/${team.id}`).expect(404);
    await request(app).get(`${base}/teams/${team.id}/roster`).expect(404);
    await request(app).get(`${base}/players/${visibleIds[0]}`).expect(404);
    await request(app).get(`${base}/staff-members/${member.id}`).expect(404);
    expect(publicPlayerListResponseSchema.parse((await request(app).get(`${base}/players`).expect(200)).body).pagination.total).toBe(0);
  });

  it("isolates league editions and hides inactive days and leagues from season context", async () => {
    const { league, season } = await fixture();
    const day = await prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number: 2, startDate: new Date("2026-10-18") } });
    await prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number: 1, isActive: false } });
    const unrelated = await prisma.season.create({ data: { name: "Unrelated", startDate: new Date("2025-08-01"), endDate: new Date("2026-06-30") } });
    const path = (seasonId: string) => `/api/v1/leagues/by-slug/${league.slug}/seasons/${seasonId}/matchdays`;
    const days = await request(app).get(path(season.id)).expect(200);
    expect(days.body).toEqual([{ id: day.id, number: 2, name: null, startDate: "2026-10-18", endDate: null }]);
    await request(app).get(path(unrelated.id)).expect(404);
    await request(app).get(`${base}/seasons/${unrelated.id}`).expect(404);
    const context = await request(app).get(`${base}/matchdays/${day.id}`).expect(200);
    expect(publicMatchdayDetailSchema.parse(context.body).league).toMatchObject({ id: league.id, slug: league.slug });
    await prisma.league.update({ where: { id: league.id }, data: { isActive: false } });
    await request(app).get(path(season.id)).expect(404);
    await request(app).get(`${base}/seasons/${season.id}`).expect(404);
    await request(app).get(`${base}/matchdays/${day.id}`).expect(404);
    for (const path of ["teams", "players", "staff-members", "seasons"]) await request(app).get(`/api/v1/${path}`).expect(401);
  });
});
