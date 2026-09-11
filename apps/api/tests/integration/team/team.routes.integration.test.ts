import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Team } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createUser } from "../../helpers/auth";

const createTeamRequest = (accessToken: string) => request(app)
  .post("/api/v1/teams")
  .set("Authorization", `Bearer ${accessToken}`);

const invalidPayloads: [Record<string, unknown>, string][] = [
  [{}, "name absent"],
  [{ name: "" }, "name empty"],
  [{ name: "a".repeat(151) }, "name too long"],
  [{ name: "Paris FC", stadium: "a".repeat(151) }, "stadium too long"],
  [{ name: "Paris FC", logoUrl: "invalid" }, "invalid logo URL"],
  [{ name: "Paris FC", isActive: false }, "isActive provided"],
  [{ name: "Paris FC", unknownField: true }, "unknown field"],
];

describe("POST /api/v1/teams", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a team with the minimal payload", async () => {
    const user = await createAdmin();

    const response = await createTeamRequest(user.accessToken)
      .send({ name: "Paris FC" });

    expect(response.status).toBe(201);
    const body = response.body as Team;
    expect(response.body).toMatchObject({
      name: "Paris FC",
      logoUrl: null,
      stadium: null,
      isActive: true,
    });
    expect(body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(body.createdAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);

    const team = await prisma.team.findUnique({
      where: { id: body.id },
    });
    expect(team).toMatchObject({
      name: "Paris FC",
      logoUrl: null,
      stadium: null,
      isActive: true,
    });
  });

  it("creates a team with all allowed fields and normalizes them", async () => {
    const user = await createAdmin();

    const response = await createTeamRequest(user.accessToken)
      .send({
        name: "  Lyon FC  ",
        logoUrl: "  https://example.com/logo.png  ",
        stadium: "  Stade central  ",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Lyon FC",
      logoUrl: "https://example.com/logo.png",
      stadium: "Stade central",
      isActive: true,
    });
  });

  it("accepts an empty logo URL and persists it as null", async () => {
    const user = await createAdmin();

    const response = await createTeamRequest(user.accessToken)
      .send({ name: "Nantes FC", logoUrl: "" });

    expect(response.status).toBe(201);
    const body = response.body as Team;
    expect(body.logoUrl).toBeNull();

    await expect(prisma.team.findUnique({
      where: { id: body.id },
    })).resolves.toMatchObject({ logoUrl: null });
  });

  it.each(invalidPayloads)("rejects %s with no database write", async (payload, _description) => {
    void _description;
    const user = await createAdmin();

    const response = await createTeamRequest(user.accessToken).send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns the generated fields and creates no participation", async () => {
    const user = await createAdmin();

    const response = await createTeamRequest(user.accessToken)
      .send({ name: "Bordeaux FC" });

    expect(response.status).toBe(201);
    const body = response.body as Team;
    expect(body.id).toEqual(expect.any(String));
    expect(body.createdAt).toEqual(expect.any(String));
    expect(body.isActive).toBe(true);
    await expect(prisma.participation.count()).resolves.toBe(0);
  });

  it("returns 401 without authentication and creates no team", async () => {
    const response = await request(app)
      .post("/api/v1/teams")
      .send({ name: "Paris FC" });

    expect(response.status).toBe(401);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns 403 for USER and creates no team", async () => {
    const user = await createUser();

    const response = await createTeamRequest(user.accessToken)
      .send({ name: "Paris FC" });

    expect(response.status).toBe(403);
    await expect(prisma.team.count()).resolves.toBe(0);
  });
});
