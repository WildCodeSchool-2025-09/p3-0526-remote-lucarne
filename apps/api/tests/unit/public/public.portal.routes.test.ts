import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import teamRouter from "../../../src/features/team/team.public.routes";
import playerRouter from "../../../src/features/player/player.public.routes";
import staffRouter from "../../../src/features/staff/staff.public.routes";
import seasonRouter from "../../../src/features/season/season.public.routes";
import leagueRouter from "../../../src/features/league/league.routes";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import { publicPlayerListResponseSchema, publicSeasonDetailSchema, publicTeamDetailSchema, type ApiErrorResponse } from "@lucarne/shared";
import * as teams from "../../../src/features/team/team.public.repository";
import * as players from "../../../src/features/player/player.public.repository";
import * as staff from "../../../src/features/staff/staff.public.repository";
import * as seasons from "../../../src/features/season/season.public.repository";
import * as leagues from "../../../src/features/league/league.public.repository";

vi.mock("../../../src/features/team/team.public.repository", () => ({ listPublicTeams: vi.fn(), findPublicTeam: vi.fn(), findPublicTeamRoster: vi.fn() }));
vi.mock("../../../src/features/player/player.public.repository", () => ({ listPublicPlayers: vi.fn(), findPublicPlayer: vi.fn() }));
vi.mock("../../../src/features/staff/staff.public.repository", () => ({ findPublicStaff: vi.fn() }));
vi.mock("../../../src/features/season/season.public.repository", () => ({ findPublicSeason: vi.fn(), findPublicMatchday: vi.fn() }));
vi.mock("../../../src/features/league/league.public.repository", () => ({ findPublicLeagueMatchdays: vi.fn() }));

const app = express();
app.use("/api/v1/public/teams", teamRouter);
app.use("/api/v1/public/players", playerRouter);
app.use("/api/v1/public/staff-members", staffRouter);
app.use("/api/v1/public", seasonRouter);
app.use("/api/v1/leagues", leagueRouter);
app.use(errorHandler);
const id = "00000000-0000-4000-8000-000000000001";
const team = { id, name: "Club", logoUrl: null, stadium: null };
const player = { id, firstName: "Alex", lastName: "Martin", nationality: null, position: null, pictureUrl: null };
const member = { id, firstName: "Sam", lastName: "Martin", nationality: "France", pictureUrl: null };
const season = { id, name: "2026-2027", startDate: new Date("2026-08-01"), endDate: new Date("2027-06-30") };
const league = { id, slug: "elite", name: "Élite", country: "France", logoUrl: null };
const day = { id, number: 1, name: null, startDate: null, endDate: null };
const edition = { league, season, isCurrent: true };

describe("Public resource routes B1", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-18T23:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("uses bounded pagination and public team DTOs without reading authentication", async () => {
    vi.mocked(teams.listPublicTeams).mockResolvedValue([[team], 21]);
    const response = await request(app).get(`/api/v1/public/teams?leagueId=${id}&page=2`).set("Authorization", "Bearer invalid").expect(200);
    expect(teams.listPublicTeams).toHaveBeenCalledWith({ leagueId: id, page: 2, limit: 20 });
    expect(response.body).toEqual({ data: [team], pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    vi.mocked(teams.findPublicTeam).mockResolvedValue({ ...team, createdAt: new Date("2026-01-01"), participations: [{ leagueSeason: edition }] });
    const detail = await request(app).get(`/api/v1/public/teams/${id}`).expect(200);
    const body = publicTeamDetailSchema.parse(detail.body);
    expect(Object.keys(body).sort()).toEqual(["id", "name", "logoUrl", "stadium", "createdAt", "editions"].sort());
    expect(body.editions[0].season.startDate).toBe("2026-08-01");
  });

  it("flattens current roster assignments using the Paris civil date", async () => {
    const rosterPlayer = { id, firstName: player.firstName, lastName: player.lastName, position: player.position, pictureUrl: player.pictureUrl };
    const rosterMember = { id, firstName: member.firstName, lastName: member.lastName, pictureUrl: member.pictureUrl };
    vi.mocked(teams.findPublicTeamRoster).mockResolvedValue({ players: [{ shirtNumber: 7, player: rosterPlayer }], staffMembers: [{ jobTitle: "Coach", staffMember: rosterMember }] });
    const response = await request(app).get(`/api/v1/public/teams/${id}/roster`).expect(200);
    expect(teams.findPublicTeamRoster).toHaveBeenCalledWith(id, new Date("2026-10-19"));
    expect(response.body).toEqual({ date: "2026-10-19", players: [{ ...rosterPlayer, shirtNumber: 7 }], staffMembers: [{ ...rosterMember, jobTitle: "Coach" }] });
  });

  it("returns only the selected current player and staff profiles", async () => {
    const record = { ...player, teamPlayers: [{ shirtNumber: 7, team }] };
    vi.mocked(players.findPublicPlayer).mockResolvedValue(record);
    vi.mocked(players.listPublicPlayers).mockResolvedValue([[record], 1]);
    vi.mocked(staff.findPublicStaff).mockResolvedValue({ ...member, teamStaffMembers: [{ jobTitle: "Coach", team }] });
    const detail = await request(app).get(`/api/v1/public/players/${id}`).expect(200);
    expect(detail.body).toEqual({ ...player, shirtNumber: 7, team });
    const list = await request(app).get(`/api/v1/public/players?teamId=${id}&search=Alex%20Martin`).expect(200);
    expect(publicPlayerListResponseSchema.parse(list.body).data).toEqual([detail.body]);
    expect(players.listPublicPlayers).toHaveBeenCalledWith({ page: 1, limit: 20, teamId: id, search: "Alex Martin" }, new Date("2026-10-19"));
    const profile = await request(app).get(`/api/v1/public/staff-members/${id}`).expect(200);
    expect(profile.body).toEqual({ ...member, jobTitle: "Coach", team });
  });

  it("serializes season and matchday context as public civil dates", async () => {
    vi.mocked(seasons.findPublicSeason).mockResolvedValue({ ...season, leagueSeasons: [edition] });
    vi.mocked(seasons.findPublicMatchday).mockResolvedValue({ ...day, leagueSeason: edition });
    vi.mocked(leagues.findPublicLeagueMatchdays).mockResolvedValue({ matchdays: [day] });
    const seasonResponse = await request(app).get(`/api/v1/public/seasons/${id}`).expect(200);
    expect(publicSeasonDetailSchema.parse(seasonResponse.body).startDate).toBe("2026-08-01");
    const dayResponse = await request(app).get(`/api/v1/public/matchdays/${id}`).expect(200);
    expect(dayResponse.body).toEqual({ ...day, league, season: { ...season, startDate: "2026-08-01", endDate: "2027-06-30" } });
    const days = await request(app).get(`/api/v1/leagues/by-slug/elite/seasons/${id}/matchdays`).expect(200);
    expect(days.body).toEqual([day]);
  });

  it.each(["teams", "players", "staff-members", "seasons", "matchdays"])("hides missing or unavailable %s with a generic 404", async (resource) => {
    vi.mocked(teams.findPublicTeam).mockResolvedValue(null);
    vi.mocked(players.findPublicPlayer).mockResolvedValue(null);
    vi.mocked(staff.findPublicStaff).mockResolvedValue(null);
    vi.mocked(seasons.findPublicSeason).mockResolvedValue(null);
    vi.mocked(seasons.findPublicMatchday).mockResolvedValue(null);
    const response = await request(app).get(`/api/v1/public/${resource}/${id}`).expect(404);
    expect((response.body as ApiErrorResponse).error.code).toBe("RESOURCE_NOT_FOUND");
    expect(JSON.stringify(response.body)).not.toContain("isActive");
  });

  it.each(["teams?limit=51", "teams?isActive=false", "players?teamId=invalid", "players?includeInactive=true", "teams/invalid/roster", `players/${id}?version=0`])("rejects invalid or administrative overrides: %s", async (path) => {
    await request(app).get(`/api/v1/public/${path}`).expect(400);
    expect(teams.listPublicTeams).not.toHaveBeenCalled();
    expect(players.listPublicPlayers).not.toHaveBeenCalled();
    expect(teams.findPublicTeamRoster).not.toHaveBeenCalled();
    expect(players.findPublicPlayer).not.toHaveBeenCalled();
  });
});
