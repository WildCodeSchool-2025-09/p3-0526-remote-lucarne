import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middlewares/errorHandler";
import { createLeagueService } from "./league.service";
import { createLeague } from "./league.controller";

vi.mock("./league.service", () => ({
  createLeagueService: vi.fn(),
}));

const create = vi.mocked(createLeagueService);

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.post("/leagues", createLeague);
  app.use(errorHandler);

  return app;
};

describe("createLeague controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the created League with status 201", async () => {
    create.mockResolvedValue({
      id: "league-id",
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: true,
      createdAt: new Date("2026-09-09T12:00:00.000Z"),
    });

    const response = await request(createTestApp())
      .post("/leagues")
      .send({ name: "Division 1", country: "France" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "league-id",
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: true,
      createdAt: "2026-09-09T12:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith({
      name: "Division 1",
      country: "France",
    });
  });
});
