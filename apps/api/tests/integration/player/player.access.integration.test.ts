import request from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import client from "../../../database/client";
import app from "../../../src/app";
import { deletePlayerService } from "../../../src/features/player/player.service";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";
import { createSeasonForLeague } from "../../helpers/season";

const createPlayer = () => prisma.player.create({ data: { firstName: "Alex", lastName: "Martin" } });

describe("player role actions", () => {
  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("allows %s to deactivate and activate a player", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const player = await createPlayer();
    const base = request(app).post(`/api/v1/players/${player.id}/deactivate`).set("Authorization", `Bearer ${user.accessToken}`);

    expect((await base).status).toBe(200);
    expect((await request(app).post(`/api/v1/players/${player.id}/activate`).set("Authorization", `Bearer ${user.accessToken}`)).status).toBe(200);
  });

  it("denies status actions to USER", async () => {
    const user = await createUser();
    const player = await createPlayer();

    const response = await request(app)
      .post(`/api/v1/players/${player.id}/deactivate`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(403);
  });

  it("restricts permanent deletion to ADMIN", async () => {
    const moderator = await createModerator();
    const admin = await createAdmin();
    const moderatorPlayer = await createPlayer();
    const adminPlayer = await createPlayer();

    const forbidden = await request(app)
      .delete(`/api/v1/players/${moderatorPlayer.id}`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ confirm: true });
    const deleted = await request(app)
      .delete(`/api/v1/players/${adminPlayer.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ confirm: true });

    expect(forbidden.status).toBe(403);
    expect(deleted.status).toBe(204);
  });

  it("deletes the player and all assignment dates while preserving the club and other players", async () => {
    const admin = await createAdmin();
    const player = await createPlayer();
    const team = await prisma.team.create({ data: { name: "Protected history team" } });
    const assignment = await prisma.teamPlayer.create({ data: {
      playerId: player.id, teamId: team.id,
      joinedAt: new Date("2020-01-01"), leftAt: new Date("2020-02-01"),
    } });
    await prisma.teamPlayer.createMany({ data: [
      { playerId: player.id, teamId: team.id, joinedAt: new Date("2026-01-01"), leftAt: new Date("2098-12-31") },
      { playerId: player.id, teamId: team.id, joinedAt: new Date("2099-01-01"), leftAt: null },
    ] });
    const otherPlayer = await createPlayer();
    const otherAssignment = await prisma.teamPlayer.create({ data: { playerId: otherPlayer.id, teamId: team.id, joinedAt: new Date("2020-01-01") } });

    const response = await request(app)
      .delete(`/api/v1/players/${player.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ confirm: true });

    expect(response.status).toBe(204);
    await expect(prisma.player.findUnique({ where: { id: player.id } })).resolves.toBeNull();
    await expect(prisma.teamPlayer.findUnique({ where: { id: assignment.id } })).resolves.toBeNull();
    await expect(prisma.teamPlayer.count({ where: { playerId: player.id } })).resolves.toBe(0);
    await expect(prisma.team.findUnique({ where: { id: team.id } })).resolves.toMatchObject({ id: team.id });
    await expect(prisma.teamPlayer.findUnique({ where: { id: otherAssignment.id } })).resolves.toEqual(otherAssignment);
  });

  it("keeps match events protected without deleting assignment dates", async () => {
    const admin = await createAdmin();
    const player = await createPlayer();
    const league = await prisma.league.create({ data: { name: "Protected event league", country: "France" } });
    const season = await createSeasonForLeague(league.id);
    const matchday = await prisma.matchday.create({ data: { leagueSeasonId: season.leagueSeasonId, number: 1 } });
    const match = await prisma.gameMatch.create({ data: { matchdayId: matchday.id } });
    const event = await prisma.matchEvent.create({ data: { matchId: match.id, playerId: player.id, minute: 10 } });
    const team = await prisma.team.create({ data: { name: "Event player team" } });
    const assignment = await prisma.teamPlayer.create({ data: { playerId: player.id, teamId: team.id, joinedAt: new Date("2020-01-01") } });

    const response = await request(app).delete(`/api/v1/players/${player.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`).send({ confirm: true });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: { code: "PROTECTED_DEPENDENCIES" } });
    await expect(prisma.player.findUnique({ where: { id: player.id } })).resolves.toMatchObject({ id: player.id });
    await expect(prisma.teamPlayer.findUnique({ where: { id: assignment.id } })).resolves.toEqual(assignment);
    await expect(prisma.matchEvent.findUnique({ where: { id: event.id } })).resolves.toEqual(event);
  });

  it("rolls back assignment removal if deleting the player fails", async () => {
    const player = await createPlayer();
    const team = await prisma.team.create({ data: { name: "Atomic deletion team" } });
    const assignment = await prisma.teamPlayer.create({ data: { playerId: player.id, teamId: team.id, joinedAt: new Date("2020-01-01") } });
    await client.query(`
      CREATE FUNCTION fail_player_deletion() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'forced player deletion failure'; END;
      $$;
      CREATE TRIGGER fail_player_deletion BEFORE DELETE ON player
      FOR EACH ROW EXECUTE FUNCTION fail_player_deletion();
    `);
    try {
      await expect(deletePlayerService(player.id, "ADMIN")).rejects.toThrow("forced player deletion failure");
      await expect(prisma.player.findUnique({ where: { id: player.id } })).resolves.toMatchObject({ id: player.id });
      await expect(prisma.teamPlayer.findUnique({ where: { id: assignment.id } })).resolves.toEqual(assignment);
    } finally {
      await client.query("DROP TRIGGER IF EXISTS fail_player_deletion ON player; DROP FUNCTION IF EXISTS fail_player_deletion()");
    }
  });
});
