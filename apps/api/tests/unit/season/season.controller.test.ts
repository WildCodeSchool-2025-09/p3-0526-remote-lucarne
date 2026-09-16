import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import { createSeasonService } from "../../../src/features/season/season.service";
import { createSeason } from "../../../src/features/season/season.controller";

vi.mock("../../../src/features/season/season.service", () => ({
  createSeasonService: vi.fn(),
}));

const create = vi.mocked(createSeasonService);

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.post("/leagues/:leagueId/seasons", createSeason);
  app.use(errorHandler);

  return app;
};

describe("createSeason controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({
      id: "season-id",
      leagueId: "league-id",
      name: "2026-2027",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2027-06-30T00:00:00.000Z"),
      isActive: false,
      version: 0,
      createdAt: new Date("2026-09-16T00:00:00.000Z"),
    });
  });

  it("returns the created season with status 201", async () => {
    const response = await request(createTestApp())
      .post("/leagues/league-id/seasons")
      .send({ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "season-id",
      leagueId: "league-id",
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
      status: "INACTIVE",
      version: 0,
      createdAt: "2026-09-16T00:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith("league-id", {
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    });
  });
});
