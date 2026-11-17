import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import { createTeamService } from "../../../src/features/team/team.service";
import { createTeam } from "../../../src/features/team/team.controller";

vi.mock("../../../src/features/team/team.service", () => ({
  createTeamService: vi.fn(),
}));

const create = vi.mocked(createTeamService);

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use((request, _response, next) => {
    request.user = { id: "user-id", role: "ADMIN" };
    next();
  });
  app.post("/teams", createTeam);
  app.use(errorHandler);

  return app;
};

describe("createTeam controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({
      id: "team-id",
      name: "Paris FC",
      logoUrl: null,
      stadium: null,
      isActive: true,
      createdAt: new Date("2026-09-11T12:00:00.000Z"),
    });
  });

  it("returns the created team with status 201", async () => {
    const response = await request(createTestApp())
      .post("/teams")
      .send({ name: "Paris FC" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "team-id",
      name: "Paris FC",
      logoUrl: null,
      stadium: null,
      isActive: true,
      createdAt: "2026-09-11T12:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith({ name: "Paris FC" });
  });
});
