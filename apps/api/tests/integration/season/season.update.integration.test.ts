import { randomUUID } from "node:crypto";
import type { ApiErrorResponse } from "@lucarne/shared";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator } from "../../helpers/auth";

const createLeague = () => prisma.league.create({
  data: { name: `League ${randomUUID()}`, country: "France", isActive: true },
});

const createSeason = (leagueId: string) => prisma.season.create({
  data: { leagueId, name: "2026-2027", startDate: new Date("2026-08-01"), endDate: new Date("2027-06-30") },
});

describe("PATCH /api/v1/seasons/:seasonId", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([createAdmin, createEditor])("allows authorized season updates", async (createUserForTest) => {
    const user = await createUserForTest();
    const league = await createLeague();
    const season = await createSeason(league.id);

    const response = await request(app)
      .patch(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "2026-2027 revised", version: 0 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: "2026-2027 revised", version: 1 });
  });

  it("rejects MODERATOR updates", async () => {
    const user = await createModerator();
    const league = await createLeague();
    const season = await createSeason(league.id);

    await request(app)
      .patch(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Forbidden", version: 0 })
      .expect(403);
  });

  it("rejects a stale version without overwriting the season", async () => {
    const user = await createAdmin();
    const league = await createLeague();
    const season = await createSeason(league.id);

    await request(app).patch(`/api/v1/seasons/${season.id}`).set("Authorization", `Bearer ${user.accessToken}`).send({ name: "First update", version: 0 }).expect(200);
    const response = await request(app).patch(`/api/v1/seasons/${season.id}`).set("Authorization", `Bearer ${user.accessToken}`).send({ name: "Stale update", version: 0 });

    expect(response.status).toBe(409);
    expect((response.body as ApiErrorResponse).error.code).toBe("RESOURCE_VERSION_CONFLICT");
    await expect(prisma.season.findUnique({ where: { id: season.id } })).resolves.toMatchObject({ name: "First update", version: 1 });
  });

  it("rejects a new period that excludes an existing matchday", async () => {
    const user = await createAdmin();
    const league = await createLeague();
    const season = await createSeason(league.id);
    await prisma.matchday.create({ data: { seasonId: season.id, number: 1, startDate: new Date("2026-08-15"), endDate: new Date("2026-08-16") } });

    const response = await request(app)
      .patch(`/api/v1/seasons/${season.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ endDate: "2026-08-01", version: 0 });

    expect(response.status).toBe(409);
    expect((response.body as ApiErrorResponse).error.code).toBe("SEASON_PERIOD_CONFLICT");
    await expect(prisma.season.findUnique({ where: { id: season.id } })).resolves.toMatchObject({ endDate: new Date("2027-06-30"), version: 0 });
  });
});
