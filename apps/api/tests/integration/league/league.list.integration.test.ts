import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import {
  createAdmin,
  createEditor,
  createModerator,
  createUser,
} from "../../helpers/auth";

const createLeague = (name: string, country: string, isActive: boolean) =>
  prisma.league.create({ data: { name, country, isActive } });

interface LeagueListBody {
  data: Array<{ name: string; status: string }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ErrorBody {
  error: { code: string };
}

const asLeagueListBody = (body: unknown): LeagueListBody => body as LeagueListBody;
const asErrorBody = (body: unknown): ErrorBody => body as ErrorBody;

describe("GET /api/v1/leagues", () => {
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
  ] as const)("allows consultation for %s", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    await createLeague("Ligue 1", "France", true);

    const response = await request(app)
      .get("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`);
    const body = asLeagueListBody(response.body);

    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    expect(body.data[0]).toMatchObject({
      name: "Ligue 1",
      status: "ACTIVE",
    });
  });

  it("rejects an unauthorised role and anonymous requests", async () => {
    const user = await createUser();

    await request(app)
      .get("/api/v1/leagues")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(403);
    await request(app).get("/api/v1/leagues").expect(401);
  });

  it("searches, filters, sorts and paginates after applying all criteria", async () => {
    const user = await createAdmin();
    await Promise.all([
      createLeague("Alpha League", "France", true),
      createLeague("Beta League", "Espagne", false),
      createLeague("Gamma France", "Italie", true),
      createLeague("Delta League", "France", true),
    ]);

    const response = await request(app)
      .get("/api/v1/leagues")
      .query({
        page: 1,
        pageSize: 20,
        search: "  league ",
        countries: "France,Espagne",
        status: "ACTIVE",
        sortBy: "name",
        sortOrder: "desc",
      })
      .set("Authorization", `Bearer ${user.accessToken}`);
    const body = asLeagueListBody(response.body);

    expect(response.status).toBe(200);
    expect(body.data.map((league) => league.name))
      .toEqual(["Delta League", "Alpha League"]);
  });

  it("includes inactive leagues when status is ALL", async () => {
    const user = await createAdmin();
    await createLeague("Inactive League", "France", false);

    const response = await request(app)
      .get("/api/v1/leagues")
      .query({ status: "ALL" })
      .set("Authorization", `Bearer ${user.accessToken}`);
    const body = asLeagueListBody(response.body);

    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("INACTIVE");
  });

  it("rejects invalid list parameters", async () => {
    const user = await createAdmin();

    const response = await request(app)
      .get("/api/v1/leagues")
      .query({ page: 0, pageSize: 10, status: "UNKNOWN" })
      .set("Authorization", `Bearer ${user.accessToken}`);
    const body = asErrorBody(response.body);

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/leagues/countries", () => {
  it("returns distinct registered countries for authorized viewers", async () => {
    const user = await createAdmin();
    await Promise.all([
      createLeague("League France", "France", true),
      createLeague("League France 2", "France", false),
      createLeague("League Spain", "Espagne", true),
    ]);

    const response = await request(app)
      .get("/api/v1/leagues/countries")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(["Espagne", "France"]);
  });

  it("rejects unauthorized country lookup", async () => {
    await request(app).get("/api/v1/leagues/countries").expect(401);
  });
});

describe("DELETE /api/v1/leagues/:leagueId", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deactivates an active league and permanently deletes an inactive one", async () => {
    const user = await createAdmin();
    const active = await createLeague("Active League", "France", true);
    const inactive = await createLeague("Inactive League", "France", false);

    await request(app)
      .delete(`/api/v1/leagues/${active.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(204);
    await expect(prisma.league.findUnique({ where: { id: active.id } }))
      .resolves.toMatchObject({ isActive: false });

    await request(app)
      .delete(`/api/v1/leagues/${inactive.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(204);
    await expect(prisma.league.findUnique({ where: { id: inactive.id } }))
      .resolves.toBeNull();
  });

  it.each([
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("does not allow %s to delete", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const league = await createLeague("Protected League", "France", true);

    await request(app)
      .delete(`/api/v1/leagues/${league.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(403);
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.not.toBeNull();
  });
});
