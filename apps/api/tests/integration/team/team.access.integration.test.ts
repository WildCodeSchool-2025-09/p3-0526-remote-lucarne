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

const payload = { name: "Paris FC" };

describe("POST /api/v1/teams access", () => {
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
  ] as const)("allows %s to create a team", async (_role, createUserForTest) => {
    const user = await createUserForTest();

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    await expect(prisma.team.count()).resolves.toBe(1);
  });

  it("returns 403 and creates no team for USER", async () => {
    const user = await createUser();

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(403);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns 401 and creates no team without a token", async () => {
    const response = await request(app)
      .post("/api/v1/teams")
      .send(payload);

    expect(response.status).toBe(401);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns 401 and creates no team for an invalid token", async () => {
    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", "Bearer invalid-token")
      .send(payload);

    expect(response.status).toBe(401);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("returns 401 and creates no team for an inactive user", async () => {
    const user = await createAdmin();

    await prisma.appUser.update({
      where: { id: user.id },
      data: { status: "DISABLED" },
    });

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload);

    expect(response.status).toBe(401);
    await expect(prisma.team.count()).resolves.toBe(0);
  });

  it("validates the body after authorization and creates no team for invalid input", async () => {
    const user = await createAdmin();

    const response = await request(app)
      .post("/api/v1/teams")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "a".repeat(151) });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    await expect(prisma.team.count()).resolves.toBe(0);
  });
});

describe("team deletion preview and protected history", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("previews protected assignments and blocks permanent deletion without altering history", async () => {
    const admin = await createAdmin();
    const team = await prisma.team.create({ data: { name: "Paris FC" } });
    const player = await prisma.player.create({ data: { firstName: "Alex", lastName: "Martin" } });
    const staffMember = await prisma.staffMember.create({ data: { firstName: "Camille", lastName: "Durand", nationality: "France" } });
    await prisma.teamPlayer.create({ data: { teamId: team.id, playerId: player.id, joinedAt: new Date("2026-01-01") } });
    await prisma.teamStaffMember.create({ data: { teamId: team.id, staffMemberId: staffMember.id, jobTitle: "COACH", joinedAt: new Date("2026-01-01") } });

    const preview = await request(app).get(`/api/v1/teams/${team.id}/deletion-preview`).set("Authorization", `Bearer ${admin.accessToken}`);
    const deletion = await request(app).delete(`/api/v1/teams/${team.id}`).set("Authorization", `Bearer ${admin.accessToken}`).send({ confirm: true });

    expect(preview.status).toBe(200);
    expect(preview.body).toEqual({ canDelete: false, dependencies: { participations: 0, playerAssignments: 1, staffAssignments: 1, homeMatches: 0, awayMatches: 0 } });
    expect(deletion.status).toBe(409);
    expect(deletion.body).toMatchObject({ error: { code: "TEAM_DELETION_BLOCKED" } });
    await expect(prisma.team.findUnique({ where: { id: team.id } })).resolves.not.toBeNull();
    await expect(prisma.teamPlayer.count({ where: { teamId: team.id } })).resolves.toBe(1);
    await expect(prisma.teamStaffMember.count({ where: { teamId: team.id } })).resolves.toBe(1);
  });

  it("requires confirmation and reserves preview access to administrators", async () => {
    const admin = await createAdmin();
    const editor = await createEditor();
    const team = await prisma.team.create({ data: { name: "Paris FC" } });

    const forbiddenPreview = await request(app).get(`/api/v1/teams/${team.id}/deletion-preview`).set("Authorization", `Bearer ${editor.accessToken}`);
    const missingConfirmation = await request(app).delete(`/api/v1/teams/${team.id}`).set("Authorization", `Bearer ${admin.accessToken}`).send({});

    expect(forbiddenPreview.status).toBe(403);
    expect(missingConfirmation.status).toBe(400);
    await expect(prisma.team.findUnique({ where: { id: team.id } })).resolves.not.toBeNull();
  });

  it("permanently deletes an independent team after confirmation", async () => {
    const admin = await createAdmin();
    const team = await prisma.team.create({ data: { name: "Paris FC" } });

    const response = await request(app).delete(`/api/v1/teams/${team.id}`).set("Authorization", `Bearer ${admin.accessToken}`).send({ confirm: true });

    expect(response.status).toBe(204);
    await expect(prisma.team.findUnique({ where: { id: team.id } })).resolves.toBeNull();
  });
});
