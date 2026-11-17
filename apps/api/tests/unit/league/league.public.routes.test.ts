import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import leagueRouter from "../../../src/features/league/league.routes";
import { getPublicLeagueService, listPublicLeagueTeamsService } from "../../../src/features/league/league.service";
import { AppError } from "../../../src/errors/AppError";

vi.mock("../../../src/features/league/league.service", () => ({ getPublicLeagueService: vi.fn(), listPublicLeagueTeamsService: vi.fn() }));
const getLeague = vi.mocked(getPublicLeagueService);
const listTeams = vi.mocked(listPublicLeagueTeamsService);
const app = express();
app.use("/api/v1/leagues", leagueRouter);
app.use(errorHandler);

describe("Public league detail route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only league identity and associated seasons without authentication", async () => {
    getLeague.mockResolvedValue({
      id: "league-id", slug: "elite", name: "Élite", country: "France", logoUrl: null,
      leagueSeasons: [{ isCurrent: true, season: { id: "season-id", name: "2026-2027" } }],
    });
    const response = await request(app).get("/api/v1/leagues/by-slug/elite").set("Authorization", "Bearer invalid").expect(200);
    expect(response.body).toEqual({
      id: "league-id", slug: "elite", name: "Élite", country: "France", logoUrl: null,
      seasons: [{ id: "season-id", name: "2026-2027", isCurrent: true }],
    });
    expect(getLeague).toHaveBeenCalledWith("elite");
  });

  it("uses the common not-found error for unavailable leagues", async () => {
    getLeague.mockRejectedValue(new AppError(404, "RESOURCE_NOT_FOUND", "Ligue introuvable."));
    const response = await request(app).get("/api/v1/leagues/by-slug/missing").expect(404);
    expect(response.body).toEqual({ error: { code: "RESOURCE_NOT_FOUND", message: "Ligue introuvable." } });
  });

  it.each(["InvalidSlug", "elite?includeInactive=true"])("rejects invalid public input: %s", async (path) => {
    await request(app).get(`/api/v1/leagues/by-slug/${path}`).expect(400);
    expect(getLeague).not.toHaveBeenCalled();
  });
});

describe("Public league teams route", () => {
  const seasonId = "00000000-0000-4000-8000-000000000001";
  const url = `/api/v1/leagues/by-slug/elite/seasons/${seasonId}/teams`;
  beforeEach(() => vi.clearAllMocks());

  it("uses validated pagination on an anonymous read", async () => {
    listTeams.mockResolvedValue({ data: [], totalItems: 21 });
    const response = await request(app).get(`${url}?page=2`).expect(200);
    expect(listTeams).toHaveBeenCalledWith("elite", seasonId, { page: 2, pageSize: 20 });
    expect(response.body).toEqual({ data: [], pagination: { page: 2, pageSize: 20, totalItems: 21, totalPages: 2 } });
  });

  it.each(["page=0", "pageSize=3", "isActive=false", "status=WITHDRAWN"])("rejects unsupported input: %s", async (query) => {
    await request(app).get(`${url}?${query}`).expect(400);
    expect(listTeams).not.toHaveBeenCalled();
  });
});
