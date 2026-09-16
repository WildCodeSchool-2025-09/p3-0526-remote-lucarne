import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";

const createSeasonFixture = async () => {
  const league = await prisma.league.create({
    data: { name: `League ${randomUUID()}`, country: "France", isActive: true },
  });
  const season = await prisma.season.create({
    data: {
      leagueId: league.id,
      name: `Season ${randomUUID()}`,
      startDate: new Date("2030-08-01"),
      endDate: new Date("2031-06-30"),
      isActive: false,
    },
  });
  const team = await prisma.team.create({ data: { name: `Team ${randomUUID()}` } });
  return { season, team };
};

describe("participation routes", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("allows %s to register a team", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const { season, team } = await createSeasonFixture();

    const response = await request(app)
      .post(`/api/v1/seasons/${season.id}/participations`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ teamId: team.id });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      teamId: team.id,
      seasonId: season.id,
      points: 0,
      rank: null,
      status: "REGISTERED",
    });
  });

  it("rejects USER and invalid payloads", async () => {
    const user = await createUser();
    const { season, team } = await createSeasonFixture();
    const url = `/api/v1/seasons/${season.id}/participations`;

    await expect(request(app).post(url).send({ teamId: team.id })).resolves.toMatchObject({ status: 401 });
    await expect(request(app)
      .post(url)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ teamId: "invalid" })).resolves.toMatchObject({ status: 403 });
  });

  it("rejects a duplicate without creating another row", async () => {
    const user = await createAdmin();
    const { season, team } = await createSeasonFixture();
    const requestRegistration = () => request(app)
      .post(`/api/v1/seasons/${season.id}/participations`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ teamId: team.id });

    await requestRegistration().expect(201);
    const duplicate = await requestRegistration();

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ error: { code: "PARTICIPATION_ALREADY_EXISTS" } });
    await expect(prisma.participation.count({ where: { seasonId: season.id, teamId: team.id } })).resolves.toBe(1);
  });

  it("previews and withdraws a participation while preserving its history", async () => {
    const user = await createAdmin();
    const { season, team } = await createSeasonFixture();
    await prisma.participation.create({
      data: { teamId: team.id, seasonId: season.id, points: 8, rank: 3 },
    });

    const preview = await request(app)
      .get(`/api/v1/seasons/${season.id}/participations/${team.id}/withdrawal-preview`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    const withdrawal = await request(app)
      .delete(`/api/v1/seasons/${season.id}/participations/${team.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(preview.status).toBe(200);
    expect(preview.body).toEqual({ teamId: team.id, seasonId: season.id, scheduledMatchCount: 0 });
    expect(withdrawal.status).toBe(200);
    expect(withdrawal.body).toMatchObject({
      participation: { teamId: team.id, seasonId: season.id, points: 8, rank: 3, status: "WITHDRAWN" },
      scheduledMatchCount: 0,
    });
    await expect(prisma.participation.count({ where: { seasonId: season.id, teamId: team.id } })).resolves.toBe(1);
  });

  it("returns an explicit error when the participation does not exist", async () => {
    const user = await createAdmin();
    const { season, team } = await createSeasonFixture();

    const response = await request(app)
      .delete(`/api/v1/seasons/${season.id}/participations/${team.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { code: "RESOURCE_NOT_FOUND" } });
  });
});
