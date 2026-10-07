import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import { createSeasonService } from "../../../src/features/season/season.service";
import { createSeason, toLeagueSeasonResponse } from "../../../src/features/season/season.controller";

vi.mock("../../../src/features/season/season.service", () => ({
  createSeasonService: vi.fn(),
}));

const create = vi.mocked(createSeasonService);

describe("toLeagueSeasonResponse", () => {
  it.each([
    { matchdayCount: null, matchesPerMatchday: null },
    { matchdayCount: 22, matchesPerMatchday: 6 },
  ])("includes the league season configuration %j", (configuration) => {
    const edition = {
      id: "edition-id", leagueId: "league-id", seasonId: "season-id", isCurrent: false,
      league: { id: "league-id", name: "League", country: "France" },
      ...configuration,
    };
    expect(toLeagueSeasonResponse(edition)).toEqual(edition);
  });
});

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.post("/seasons", createSeason);
  app.use(errorHandler);

  return app;
};

describe("createSeason controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({
      id: "season-id",
      name: "2026-2027",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2027-06-30T00:00:00.000Z"),
      version: 0,
      createdAt: new Date("2026-09-16T00:00:00.000Z"),
    });
  });

  it("returns the created season with status 201", async () => {
    const response = await request(createTestApp())
      .post("/seasons")
      .send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "season-id",
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
      version: 0,
      createdAt: "2026-09-16T00:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith({
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    });
  });
});
