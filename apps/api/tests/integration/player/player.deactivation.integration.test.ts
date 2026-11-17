import type { PlayerDetail } from "@lucarne/shared";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createEditor } from "../../helpers/auth";

describe.each(["action", "patch"] as const)("player deactivation via %s", (method) => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }).setSystemTime(new Date("2026-10-06T12:00:00Z")));
  afterEach(() => vi.useRealTimers());

  it.each([
    { joinedAt: "2026-10-06", leftAt: null },
    { joinedAt: "2026-10-05", leftAt: null },
    { joinedAt: "2026-10-05", leftAt: "2026-10-06" },
    { joinedAt: "2026-10-02", leftAt: "2026-10-10" },
  ])("preserves every assignment with current period $joinedAt/$leftAt", async ({ joinedAt, leftAt }) => {
    const editor = await createEditor();
    const player = await prisma.player.create({ data: { firstName: "Alex", lastName: "Martin" } });
    const team = await prisma.team.create({ data: { name: "Assignment dates team" } });
    await prisma.teamPlayer.createMany({ data: [
      { playerId: player.id, teamId: team.id, joinedAt: new Date("2025-01-01"), leftAt: new Date("2025-12-31") },
      { playerId: player.id, teamId: team.id, joinedAt: new Date(joinedAt), leftAt: leftAt ? new Date(leftAt) : null },
      ...(leftAt ? [{ playerId: player.id, teamId: team.id, joinedAt: new Date("2026-11-01"), leftAt: null }] : []),
    ] });
    const before = await prisma.teamPlayer.findMany({ where: { playerId: player.id }, orderBy: { joinedAt: "asc" } });
    const response = method === "action"
      ? await request(app).post(`/api/v1/players/${player.id}/deactivate`).set("Authorization", `Bearer ${editor.accessToken}`)
      : await request(app).patch(`/api/v1/players/${player.id}`).set("Authorization", `Bearer ${editor.accessToken}`).send({ isActive: false, version: player.version });

    expect(response.status).toBe(200);
    const detail = response.body as PlayerDetail;
    expect(detail).toMatchObject({ isActive: false, activeTeam: null, isSelectable: false, version: player.version + 1 });
    expect(detail.assignments.find((assignment) => assignment.joinedAt === joinedAt)).toMatchObject({ state: "CURRENT", leftAt });
    await expect(prisma.teamPlayer.findMany({ where: { playerId: player.id }, orderBy: { joinedAt: "asc" } })).resolves.toEqual(before);

    const repeated = await request(app).post(`/api/v1/players/${player.id}/deactivate`).set("Authorization", `Bearer ${editor.accessToken}`);
    expect(repeated.status).toBe(200);
    expect(repeated.body).toMatchObject({ version: detail.version });
    const reactivated = await request(app).post(`/api/v1/players/${player.id}/activate`).set("Authorization", `Bearer ${editor.accessToken}`);
    expect(reactivated.status).toBe(200);
    expect(reactivated.body).toMatchObject({ isActive: true, isSelectable: true, activeTeam: { id: team.id } });
    await expect(prisma.teamPlayer.findMany({ where: { playerId: player.id }, orderBy: { joinedAt: "asc" } })).resolves.toEqual(before);
  });
});
