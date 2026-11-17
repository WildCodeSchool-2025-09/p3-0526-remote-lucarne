import type { PlayerDetail, TeamRoster } from "@lucarne/shared";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createEditor, createUser } from "../../helpers/auth";

describe.each(["player", "staff"] as const)("%s inclusive assignment API", (domain) => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }).setSystemTime(new Date("2026-10-05T12:00:00Z")));
  afterEach(() => vi.useRealTimers());
  const fixture = async (active = true) => {
    const editor = await createEditor();
    const team = await prisma.team.create({ data: { name: randomUUID(), isActive: active } });
    const identity = { firstName: "Marie", lastName: "Martin", nationality: "France" };
    const person = domain === "player" ? await prisma.player.create({ data: identity }) : await prisma.staffMember.create({ data: identity });
    const path = `/api/v1/${domain === "player" ? "players" : "staff-members"}/${person.id}/assignments`;
    const post = (joinedAt: string, leftAt?: string | null) => request(app).post(path).set("Authorization", `Bearer ${editor.accessToken}`).send({ teamId: team.id, joinedAt, ...(leftAt === undefined ? {} : { leftAt }), ...(domain === "staff" ? { jobTitle: "Coach" } : {}) });
    return { editor, team, person, path, post };
  };
  it("creates historical periods on an inactive team and validates strict dates", async () => {
    const f = await fixture(false);
    const historic = await f.post("2025-01-01", "2025-12-31");
    expect(historic.status).toBe(201);
    expect((historic.body as PlayerDetail).assignments[0]).toMatchObject({ leftAt: "2025-12-31", state: "HISTORICAL" });
    expect((await f.post("2026-10-05", "2026-10-05")).status).toBe(400);
    expect((await f.post("2026-10-05", "2026-10-06")).status).toBe(409);
  });
  it("edits dates, preserves omitted ends, clears explicit null and refuses conflicts atomically", async () => {
    const f = await fixture();
    const first = await f.post("2025-01-01", "2025-12-31");
    const id = (first.body as PlayerDetail).assignments[0].id;
    expect((await f.post("2026-01-01", "2026-10-31")).status).toBe(201);
    const patch = (input: object) => request(app).patch(`${f.path}/${id}`).set("Authorization", `Bearer ${f.editor.accessToken}`).send(input);
    const preserved = await patch({ joinedAt: "2025-02-01" });
    expect(preserved.status).toBe(200);
    expect((preserved.body as PlayerDetail).assignments.find((a: { id: string }) => a.id === id)).toMatchObject({ joinedAt: "2025-02-01", leftAt: "2025-12-31" });
    const conflicting = await patch({ joinedAt: "2025-02-01", leftAt: null });
    expect(conflicting.status).toBe(409);
    expect((conflicting.body as { error: { code: string } }).error.code).toBe("ASSIGNMENT_PERIOD_CONFLICT");
    const unchanged = await request(app).get(f.path.replace("/assignments", "")).set("Authorization", `Bearer ${f.editor.accessToken}`);
    expect((unchanged.body as PlayerDetail).version).toBe((preserved.body as PlayerDetail).version);
    expect((await patch({ joinedAt: "2025-02-01", leftAt: "2025-02-01" })).status).toBe(400);
    const other = await fixture();
    expect((await request(app).patch(`${other.path}/${id}`).set("Authorization", `Bearer ${other.editor.accessToken}`).send({ joinedAt: "2025-02-01" })).status).toBe(404);
  });
  it("adds a later end to an open assignment and accepts null when no other period conflicts", async () => {
    const f = await fixture();
    const created = await f.post("2026-01-01");
    const id = (created.body as PlayerDetail).assignments[0].id;
    const patch = (leftAt: string | null) => request(app).patch(`${f.path}/${id}`).set("Authorization", `Bearer ${f.editor.accessToken}`).send({ joinedAt: "2026-01-01", leftAt });
    expect((await patch("2026-12-31")).status).toBe(200);
    const cleared = await patch(null);
    expect(cleared.status).toBe(200);
    expect((cleared.body as PlayerDetail).assignments[0].leftAt).toBeNull();
  });
  it("rejects historical conflicts without altering an open current period", async () => {
    const f = await fixture();
    const current = await f.post("2026-01-01");
    expect((await f.post("2026-09-01", "2026-09-30")).status).toBe(409);
    const detail = await request(app).get(f.path.replace("/assignments", "")).set("Authorization", `Bearer ${f.editor.accessToken}`);
    expect((detail.body as PlayerDetail).version).toBe((current.body as PlayerDetail).version);
    expect((detail.body as PlayerDetail).assignments).toHaveLength(1);
    expect((detail.body as PlayerDetail).assignments[0].leftAt).toBeNull();
  });
  it("serializes concurrent overlapping creations and enforces writer permissions", async () => {
    const f = await fixture();
    const results = await Promise.all([f.post("2026-11-01", "2026-11-10"), f.post("2026-11-05", "2026-11-15")]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    const user = await createUser();
    const created = results.find((result) => result.status === 201)!;
    const id = (created.body as PlayerDetail).assignments[0].id;
    expect((await request(app).patch(`${f.path}/${id}`).send({ joinedAt: "2026-11-01" })).status).toBe(401);
    expect((await request(app).patch(`${f.path}/${id}`).set("Authorization", `Bearer ${user.accessToken}`).send({ joinedAt: "2026-11-01" })).status).toBe(403);
  });
  it("includes inactive people and inclusive end dates in an inactive team's exact roster", async () => {
    const f = await fixture();
    expect((await f.post("2026-01-01", "2026-10-05")).status).toBe(201);
    if (domain === "player") await prisma.player.update({ where: { id: f.person.id }, data: { isActive: false } });
    else await prisma.staffMember.update({ where: { id: f.person.id }, data: { isActive: false } });
    await prisma.team.update({ where: { id: f.team.id }, data: { isActive: false } });
    const roster = await request(app).get(`/api/v1/teams/${f.team.id}/roster`).set("Authorization", `Bearer ${f.editor.accessToken}`);
    expect(roster.status).toBe(200);
    expect((roster.body as TeamRoster).date).toBe("2026-10-05");
    expect((roster.body as TeamRoster)[domain === "player" ? "players" : "staffMembers"]).toEqual([expect.objectContaining({ id: f.person.id, lastName: "Martin" })]);
    vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
    // Obtain a fresh session after the simulated day change.
    const editor = await createEditor();
    const next = await request(app).get(`/api/v1/teams/${f.team.id}/roster`).set("Authorization", `Bearer ${editor.accessToken}`);
    expect(next.status).toBe(200);
    expect((next.body as TeamRoster)[domain === "player" ? "players" : "staffMembers"]).toEqual([]);
  });
});

describe("complete team roster", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }).setSystemTime(new Date("2026-10-05T12:00:00Z")));
  afterEach(() => vi.useRealTimers());

  it("returns photos, positions and the current assignment's shirt number, preserving missing values", async () => {
    const editor = await createEditor();
    const team = await prisma.team.create({ data: { name: randomUUID() } });
    const player = await prisma.player.create({ data: { firstName: "Zoé", lastName: "Albert", position: "Milieu", pictureUrl: "/photos/zoe.jpg" } });
    const otherPlayer = await prisma.player.create({ data: { firstName: "Anne", lastName: "Bernard" } });
    await prisma.teamPlayer.createMany({ data: [
      { playerId: player.id, teamId: team.id, joinedAt: new Date("2025-01-01"), leftAt: new Date("2025-12-31"), shirtNumber: 6 },
      { playerId: player.id, teamId: team.id, joinedAt: new Date("2026-01-01"), shirtNumber: 8 },
      { playerId: otherPlayer.id, teamId: team.id, joinedAt: new Date("2026-01-01") },
    ] });
    const staff = await prisma.staffMember.create({ data: { firstName: "Marie", lastName: "Martin", nationality: "France", pictureUrl: "/photos/coach.jpg" } });
    await prisma.teamStaffMember.create({ data: { staffMemberId: staff.id, teamId: team.id, jobTitle: "Coach", joinedAt: new Date("2026-01-01") } });

    const result = await request(app).get(`/api/v1/teams/${team.id}/roster`).set("Authorization", `Bearer ${editor.accessToken}`);
    expect(result.status).toBe(200);
    const roster = result.body as TeamRoster;
    expect(roster.players).toHaveLength(2);
    expect(roster.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: player.id, position: "Milieu", pictureUrl: "/photos/zoe.jpg", shirtNumber: 8 }),
      expect.objectContaining({ id: otherPlayer.id, position: null, pictureUrl: null, shirtNumber: null }),
    ]));
    expect(roster.staffMembers).toEqual([expect.objectContaining({ id: staff.id, position: "Coach", pictureUrl: "/photos/coach.jpg" })]);
    expect(roster.staffMembers[0]).not.toHaveProperty("shirtNumber");
  });

  it("does not truncate at twenty and excludes future, expired and other-team assignments", async () => {
    const editor = await createEditor();
    const team = await prisma.team.create({ data: { name: randomUUID() } });
    const otherTeam = await prisma.team.create({ data: { name: randomUUID() } });
    const ids = Array.from({ length: 28 }, () => randomUUID());
    await prisma.player.createMany({ data: ids.map((id) => ({ id, firstName: "Marie", lastName: "Martin" })) });
    await prisma.teamPlayer.createMany({ data: ids.map((playerId, index) => ({ playerId, teamId: index === 27 ? otherTeam.id : team.id, joinedAt: new Date(index === 25 ? "2099-01-01" : "2000-01-01"), leftAt: index === 26 ? new Date("2001-01-01") : null })) });
    const result = await request(app).get(`/api/v1/teams/${team.id}/roster`).set("Authorization", `Bearer ${editor.accessToken}`);
    expect(result.status).toBe(200);
    expect((result.body as TeamRoster).players).toHaveLength(25);
    expect((result.body as TeamRoster).players.map((player) => player.id).sort()).toEqual(ids.slice(0, 25).sort());
  });
});
