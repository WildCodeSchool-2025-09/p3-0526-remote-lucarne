import request from "supertest";
import type { PublicLeagueDetail } from "@lucarne/shared";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createUser } from "../../helpers/auth";
import { createSeasonForLeague } from "../../helpers/season";

describe("Public league navigation", () => {
  it("resolves an active slug anonymously with only its own seasons and a minimal DTO", async () => {
    const league = await prisma.league.create({ data: { name: "Public detail", country: "France", isActive: true } });
    const other = await prisma.league.create({ data: { name: "Other", country: "France", isActive: true } });
    const previous = await createSeasonForLeague(league.id, "Previous season");
    const current = await createSeasonForLeague(league.id, "Current season");
    await prisma.season.update({ where: { id: previous.id }, data: { startDate: new Date("2025-08-01") } });
    await prisma.leagueSeason.update({ where: { id: current.leagueSeasonId }, data: { isCurrent: true } });
    await createSeasonForLeague(other.id, "Private context");
    const response = await request(app).get(`/api/v1/leagues/by-slug/${league.slug}`).set("Authorization", "Bearer invalid").expect(200);
    expect(response.body).toEqual({
      id: league.id, slug: league.slug, name: league.name, country: "France", logoUrl: null,
      seasons: [
        { id: current.id, name: current.name, isCurrent: true },
        { id: previous.id, name: previous.name, isCurrent: false },
      ],
    });
    await request(app).get(`/api/v1/leagues/${league.id}`).expect(401);
    await request(app).get(`/api/v1/leagues/${league.id}/seasons`).expect(401);
  });

  it("returns empty public seasons and hides inactive or unknown leagues", async () => {
    const league = await prisma.league.create({ data: { name: "Empty detail", country: "France", isActive: true } });
    expect((await request(app).get(`/api/v1/leagues/by-slug/${league.slug}`).expect(200)).body).toMatchObject({ seasons: [] });
    await prisma.league.update({ where: { id: league.id }, data: { isActive: false } });
    for (const slug of [league.slug, "missing-league"]) {
      const response = await request(app).get(`/api/v1/leagues/by-slug/${slug}`).expect(404);
      expect(response.body).toEqual({ error: { code: "RESOURCE_NOT_FOUND", message: "Ligue introuvable." } });
    }
    await request(app).get("/api/v1/leagues/by-slug/InvalidSlug").expect(400);
    await request(app).get(`/api/v1/leagues/by-slug/${league.slug}?includeInactive=true`).expect(400);
  });

  it("makes every associated season selectable beyond the administrative page size", async () => {
    const league = await prisma.league.create({ data: { name: "Many seasons", country: "France", isActive: true } });
    const seasons = await prisma.season.createManyAndReturn({ data: Array.from({ length: 23 }, (_, index) => ({
      name: `Archive ${index}`, startDate: new Date("2025-08-01"), endDate: new Date("2026-06-30"),
    })) });
    await prisma.leagueSeason.createMany({ data: seasons.map((season) => ({ leagueId: league.id, seasonId: season.id })) });
    const response = await request(app).get(`/api/v1/leagues/by-slug/${league.slug}`).expect(200);
    expect((response.body as PublicLeagueDetail).seasons).toHaveLength(23);
  });

  it("lists all active leagues without authentication, in deterministic order and with a minimal DTO", async () => {
    await prisma.league.createMany({ data: [
      { name: "Hidden", country: "France", isActive: false },
      { name: "Zulu", country: "France", isActive: true },
      { name: "Alpha", country: "France", isActive: true, logoUrl: "/api/v1/uploads/photos/logo.png" },
      { name: "Alpha", country: "Belgique", isActive: true },
      ...Array.from({ length: 22 }, (_, index) => ({ name: `League ${String(index).padStart(2, "0")}`, country: "France", isActive: true })),
    ] });
    const response = await request(app).get("/api/v1/leagues/navigation").expect(200);
    const body = response.body as { id: string; slug: string; name: string; country: string; logoUrl: string | null }[];
    expect(body).toHaveLength(25);
    expect(body.slice(0, 2).map(({ name, country }) => [name, country])).toEqual([["Alpha", "Belgique"], ["Alpha", "France"]]);
    expect(body.at(-1)?.name).toBe("Zulu");
    for (const league of body) {
      expect(Object.keys(league).sort()).toEqual(["country", "id", "logoUrl", "name", "slug"]);
      expect(league.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
    expect(body[1]?.logoUrl).toBe("/api/v1/uploads/photos/logo.png");
    expect(body.some(({ name }) => name === "Hidden")).toBe(false);
  });

  it("returns an empty list and ignores invalid credentials on a public read", async () => {
    const response = await request(app).get("/api/v1/leagues/navigation").set("Authorization", "Bearer invalid").expect(200);
    expect(response.body).toEqual([]);
  });

  it.each(["status=ALL", "page=1", "includeInactive=true"])("rejects unsupported query %s", async (query) => {
    await request(app).get(`/api/v1/leagues/navigation?${query}`).expect(400);
  });

  it("preserves the slug through admin renaming and activation transitions", async () => {
    const admin = await createAdmin();
    const league = await prisma.league.create({ data: { name: "Élite Féminine", country: "France", isActive: true } });
    await request(app).patch(`/api/v1/leagues/${league.id}`).set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ name: "Renamed League", version: 0 }).expect(200);
    await request(app).patch(`/api/v1/leagues/${league.id}/deactivate`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    expect((await request(app).get("/api/v1/leagues/navigation")).body).toEqual([]);
    await request(app).patch(`/api/v1/leagues/${league.id}/activate`).set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
    expect((await request(app).get("/api/v1/leagues/navigation")).body).toEqual([
      { id: league.id, slug: league.slug, name: "Renamed League", country: "France", logoUrl: null },
    ]);
    await request(app).patch(`/api/v1/leagues/${league.id}`).set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ slug: "changed", version: 3 }).expect(400);
  });

  it("keeps administrative list, detail and writes protected", async () => {
    const league = await prisma.league.create({ data: { name: "Protected", country: "France", isActive: true } });
    const user = await createUser();
    await request(app).get("/api/v1/leagues").expect(401);
    await request(app).get(`/api/v1/leagues/${league.id}`).expect(401);
    await request(app).post("/api/v1/leagues").send({ name: "No", country: "France" }).expect(401);
    await request(app).get("/api/v1/leagues").set("Authorization", `Bearer ${user.accessToken}`).expect(403);
  });
});
