import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { PlayerDetail } from "@lucarne/shared";
import client from "../../../database/client";
import prisma from "../../../database/prisma";
import request from "supertest";
import app from "../../../src/app";
import { createPlayerAssignmentService, deactivatePlayerService, getPlayerService, listPlayersService } from "../../../src/features/player/player.service";
import { assignmentState } from "../../../src/features/player/player.assignment";
import { createEditor, createUser } from "../../helpers/auth";
import { describe, expect, it } from "vitest";

const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const migrationPath = fileURLToPath(new URL("../../../prisma/migrations/20260913120000_team_player_source_of_truth/migration.sql", import.meta.url));

const createTeam = () => prisma.team.create({ data: { name: `Team ${randomUUID()}` } });
const createPlayer = (isActive = true) => prisma.player.create({
  data: { firstName: "Alex", lastName: "Martin", isActive },
});

const createMigrationSchema = async () => {
  const schema = `migration_${randomUUID().replaceAll("-", "")}`;
  const connection = await client.connect();
  await connection.query(`CREATE SCHEMA ${schema}`);
  await connection.query(`SET search_path TO ${schema}, public`);
  await connection.query(`
    CREATE TABLE team (id UUID PRIMARY KEY);
    CREATE TABLE player (
      id UUID PRIMARY KEY,
      team_id UUID REFERENCES team(id),
      created_at TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN NOT NULL
    );
    CREATE TABLE team_player (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES team(id),
      player_id UUID NOT NULL REFERENCES player(id),
      joined_at DATE NOT NULL,
      left_at DATE,
      CONSTRAINT chk_team_player_dates CHECK (left_at IS NULL OR left_at >= joined_at)
    );
    CREATE UNIQUE INDEX uq_active_team_player_per_player
      ON team_player(player_id) WHERE left_at IS NULL;
  `);
  return {
    connection,
    schema,
    cleanup: async () => {
      await connection.query("RESET search_path");
      await connection.query(`DROP SCHEMA ${schema} CASCADE`);
      connection.release();
    },
  };
};

describe("team_player source of truth migration", () => {
  it("backfills legacy teams once, preserves history, and removes player.team_id", async () => {
    const database = await createMigrationSchema();
    const migration = await readFile(migrationPath, "utf8");
    const teamId = randomUUID();
    const legacyPlayerId = randomUUID();
    const unassignedPlayerId = randomUUID();
    const historicalPlayerId = randomUUID();

    try {
      await database.connection.query("INSERT INTO team (id) VALUES ($1)", [teamId]);
      await database.connection.query(
        "INSERT INTO player (id, team_id, created_at, is_active) VALUES ($1, $2, $3, TRUE), ($4, NULL, $3, TRUE), ($5, $2, $3, TRUE)",
        [legacyPlayerId, teamId, "2026-01-02T12:00:00.000Z", unassignedPlayerId, historicalPlayerId],
      );
      await database.connection.query(
        "INSERT INTO team_player (id, team_id, player_id, joined_at, left_at) VALUES ($1, $2, $3, $4, $5)",
        [randomUUID(), teamId, historicalPlayerId, "2025-01-01", "2025-12-31"],
      );

      await database.connection.query(migration);

      await expect(database.connection.query("SELECT team_id FROM player")).rejects.toThrow();
      await expect(database.connection.query("SELECT team_id, to_char(joined_at, 'YYYY-MM-DD') AS joined_at, left_at FROM team_player WHERE player_id = $1", [legacyPlayerId]))
        .resolves.toMatchObject({ rows: [{ team_id: teamId, joined_at: "2026-01-02", left_at: null }] });
      await expect(database.connection.query("SELECT * FROM team_player WHERE player_id = $1", [unassignedPlayerId]))
        .resolves.toMatchObject({ rowCount: 0 });
      await expect(database.connection.query("SELECT to_char(left_at, 'YYYY-MM-DD') AS left_at FROM team_player WHERE player_id = $1", [historicalPlayerId]))
        .resolves.toMatchObject({ rowCount: 1, rows: [{ left_at: "2025-12-31" }] });
    } finally {
      await database.cleanup();
    }
  });

  it("fails explicitly without dropping data when legacy and team_player contradict each other", async () => {
    const database = await createMigrationSchema();
    const migration = await readFile(migrationPath, "utf8");
    const legacyTeamId = randomUUID();
    const assignmentTeamId = randomUUID();
    const playerId = randomUUID();

    try {
      await database.connection.query("INSERT INTO team (id) VALUES ($1), ($2)", [legacyTeamId, assignmentTeamId]);
      await database.connection.query(
        "INSERT INTO player (id, team_id, created_at, is_active) VALUES ($1, $2, $3, TRUE)",
        [playerId, legacyTeamId, "2026-01-02T12:00:00.000Z"],
      );
      await database.connection.query(
        "INSERT INTO team_player (id, team_id, player_id, joined_at) VALUES ($1, $2, $3, $4)",
        [randomUUID(), assignmentTeamId, playerId, "2026-01-02"],
      );

      await expect(database.connection.query(migration)).rejects.toThrow("legacy team contradicts team_player");
      await expect(database.connection.query("SELECT team_id FROM player WHERE id = $1", [playerId]))
        .resolves.toMatchObject({ rows: [{ team_id: legacyTeamId }] });
      await expect(database.connection.query("SELECT * FROM team_player WHERE player_id = $1", [playerId]))
        .resolves.toMatchObject({ rowCount: 1 });
    } finally {
      await database.cleanup();
    }
  });
});

describe("team_player integrity and player deactivation", () => {
  it("prevents overlapping assignments while retaining historical assignments and protecting teams", async () => {
    const [firstTeam, secondTeam, player] = await Promise.all([createTeam(), createTeam(), createPlayer()]);
    await prisma.teamPlayer.create({ data: { teamId: firstTeam.id, playerId: player.id, joinedAt: date("2025-01-01"), leftAt: date("2025-12-31") } });
    await prisma.teamPlayer.create({ data: { teamId: secondTeam.id, playerId: player.id, joinedAt: date("2026-01-01"), leftAt: date("2099-01-01") } });

    await expect(prisma.teamPlayer.create({ data: { teamId: firstTeam.id, playerId: player.id, joinedAt: date("2026-02-01") } })).rejects.toThrow();
    await expect(prisma.teamPlayer.create({ data: { teamId: firstTeam.id, playerId: player.id, joinedAt: date("2026-02-01"), leftAt: date("2026-01-31") } })).rejects.toThrow();
    await expect(prisma.team.delete({ where: { id: secondTeam.id } })).rejects.toMatchObject({ code: "P2003" });
  });

  it("schedules a future assignment, closes the predecessor the day before, and accepts successive planned assignments", async () => {
    const [currentTeam, futureTeam, anotherFutureTeam, player] = await Promise.all([createTeam(), createTeam(), createTeam(), createPlayer()]);
    const currentLogoUrl = "https://example.com/club-logo.png";
    await prisma.team.update({ where: { id: currentTeam.id }, data: { logoUrl: currentLogoUrl } });
    await prisma.teamPlayer.create({ data: { teamId: currentTeam.id, playerId: player.id, joinedAt: date("2026-01-01") } });

    const scheduled = await createPlayerAssignmentService(player.id, { teamId: futureTeam.id, joinedAt: "2099-01-01" });

    expect(scheduled.activeTeam).toMatchObject({ id: currentTeam.id });
    expect(scheduled.assignments).toEqual(expect.arrayContaining([
      expect.objectContaining({ team: { id: currentTeam.id, name: currentTeam.name, logoUrl: currentLogoUrl }, leftAt: "2098-12-31", state: "CURRENT" }),
      expect.objectContaining({ team: { id: futureTeam.id, name: futureTeam.name, logoUrl: null }, leftAt: null, state: "PLANNED" }),
    ]));
    const second = await createPlayerAssignmentService(player.id, { teamId: anotherFutureTeam.id, joinedAt: "2099-02-01" });
    expect(second.assignments).toEqual(expect.arrayContaining([expect.objectContaining({ team: { id: futureTeam.id, name: futureTeam.name, logoUrl: null }, leftAt: "2099-01-31" })]));
    expect(assignmentState({ joinedAt: date("2026-01-01"), leftAt: date("2098-12-31") }, date("2099-01-01"))).toBe("HISTORICAL");
    expect(assignmentState({ joinedAt: date("2099-01-01"), leftAt: null }, date("2099-01-01"))).toBe("CURRENT");
  });

  it("exposes assignment planning to writers only and validates its payload", async () => {
    const [editor, user, team, anotherTeam, player] = await Promise.all([createEditor(), createUser(), createTeam(), createTeam(), createPlayer()]);

    const forbidden = await request(app)
      .post(`/api/v1/players/${player.id}/assignments`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ teamId: team.id, joinedAt: "2099-01-01" });
    const invalid = await request(app)
      .post(`/api/v1/players/${player.id}/assignments`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ teamId: team.id });
    const created = await request(app)
      .post(`/api/v1/players/${player.id}/assignments`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ teamId: team.id, joinedAt: "2099-01-01", shirtNumber: 8 });
    const duplicate = await request(app)
      .post(`/api/v1/players/${player.id}/assignments`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ teamId: anotherTeam.id, joinedAt: "2099-01-01" });

    expect(forbidden.status).toBe(403);
    expect(invalid.status).toBe(400);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ assignments: [{ team: { id: team.id }, state: "PLANNED", shirtNumber: 8 }] });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ error: { code: "ASSIGNMENT_PERIOD_CONFLICT" } });
    await expect(prisma.teamPlayer.count({ where: { playerId: player.id } })).resolves.toBe(1);
  });

  it("does not present a future assignment as active and allows homonyms", async () => {
    const team = await createTeam();
    const [futurePlayer, namesake] = await Promise.all([createPlayer(), createPlayer()]);
    await prisma.teamPlayer.create({ data: { teamId: team.id, playerId: futurePlayer.id, joinedAt: date("2099-01-01") } });

    const futureDetail = await getPlayerService(futurePlayer.id);
    expect(futureDetail).toMatchObject({ activeTeam: null, isSelectable: false, assignments: [{ state: "PLANNED", team: { id: team.id } }] });

    const listed = await listPlayersService({ search: "Alex Martin", page: 1, pageSize: 20 });
    expect(listed.data.filter(({ firstName, lastName }) => firstName === "Alex" && lastName === "Martin")).toHaveLength(2);
    expect(namesake.id).not.toBe(futurePlayer.id);
  });

  it("filters players by active status without changing the default list", async () => {
    await Promise.all([createPlayer(true), createPlayer(false)]);

    const active = await listPlayersService({ status: "ACTIVE", page: 1, pageSize: 20 });
    const inactive = await listPlayersService({ status: "INACTIVE", page: 1, pageSize: 20 });
    const all = await listPlayersService({ status: "ALL", page: 1, pageSize: 20 });

    expect(active.data).toHaveLength(1);
    expect(active.data[0]?.isActive).toBe(true);
    expect(inactive.data).toHaveLength(1);
    expect(inactive.data[0]?.isActive).toBe(false);
    expect(all.data).toHaveLength(2);
  });

  it("preserves current and planned assignment dates and is idempotent", async () => {
    const [currentTeam, futureTeam, currentPlayer, futurePlayer] = await Promise.all([createTeam(), createTeam(), createPlayer(), createPlayer()]);
    await prisma.teamPlayer.create({ data: { teamId: currentTeam.id, playerId: currentPlayer.id, joinedAt: date("2026-01-01") } });
    await prisma.teamPlayer.create({ data: { teamId: futureTeam.id, playerId: futurePlayer.id, joinedAt: date("2099-01-01") } });

    const result = await deactivatePlayerService(currentPlayer.id);
    const repeated = await deactivatePlayerService(currentPlayer.id);
    const plannedResult = await deactivatePlayerService(futurePlayer.id);
    expect(result).toMatchObject({ isActive: false, activeTeam: null, isSelectable: false, assignments: [{ team: { id: currentTeam.id }, state: "CURRENT", joinedAt: "2026-01-01", leftAt: null }] });
    expect(repeated.version).toBe(result.version);
    expect(plannedResult).toMatchObject({ isActive: false, assignments: [{ team: { id: futureTeam.id }, state: "PLANNED", leftAt: null }] });
  });

  it("makes deactivation idempotent through the HTTP API while retaining a planned assignment", async () => {
    const [editor, currentTeam, futureTeam, player] = await Promise.all([createEditor(), createTeam(), createTeam(), createPlayer()]);
    await prisma.teamPlayer.create({ data: { teamId: currentTeam.id, playerId: player.id, joinedAt: date("2026-01-01"), leftAt: date("2098-12-31") } });
    await prisma.teamPlayer.create({ data: { teamId: futureTeam.id, playerId: player.id, joinedAt: date("2099-01-01") } });

    const first = await request(app)
      .post(`/api/v1/players/${player.id}/deactivate`)
      .set("Authorization", `Bearer ${editor.accessToken}`);
    const repeated = await request(app)
      .post(`/api/v1/players/${player.id}/deactivate`)
      .set("Authorization", `Bearer ${editor.accessToken}`);
    const firstBody = first.body as PlayerDetail;
    const repeatedBody = repeated.body as PlayerDetail;

    expect(first.status).toBe(200);
    expect(firstBody).toMatchObject({ isActive: false });
    expect(firstBody.assignments.some((assignment) => assignment.team.id === currentTeam.id && assignment.state === "CURRENT" && assignment.leftAt === "2098-12-31")).toBe(true);
    expect(firstBody.assignments.some((assignment) => assignment.team.id === futureTeam.id && assignment.state === "PLANNED" && assignment.leftAt === null)).toBe(true);
    expect(repeated.status).toBe(200);
    expect(repeatedBody.version).toBe(firstBody.version);
    const assignments = await prisma.teamPlayer.findMany({ where: { playerId: player.id }, orderBy: { joinedAt: "asc" } });
    expect(assignments).toHaveLength(2);
    expect(assignments[0]).toMatchObject({ teamId: currentTeam.id, joinedAt: date("2026-01-01"), leftAt: date("2098-12-31") });
    expect(assignments[1]).toMatchObject({ teamId: futureTeam.id, leftAt: null });
  });

  it("retains assignment dates and active status when the player status update fails", async () => {
    const [team, player] = await Promise.all([createTeam(), createPlayer()]);
    await prisma.teamPlayer.create({ data: { teamId: team.id, playerId: player.id, joinedAt: date("2026-01-01") } });
    await client.query(`
      CREATE OR REPLACE FUNCTION phase2_fail_player_deactivation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'forced deactivation failure'; END;
      $$;
      CREATE TRIGGER phase2_fail_player_deactivation
      BEFORE UPDATE OF is_active ON player FOR EACH ROW EXECUTE FUNCTION phase2_fail_player_deactivation();
    `);

    try {
      await expect(deactivatePlayerService(player.id)).rejects.toThrow("forced deactivation failure");
      await expect(prisma.teamPlayer.findFirstOrThrow({ where: { playerId: player.id } })).resolves.toMatchObject({ leftAt: null });
      await expect(prisma.player.findUniqueOrThrow({ where: { id: player.id } })).resolves.toMatchObject({ isActive: true });
    } finally {
      await client.query("DROP TRIGGER IF EXISTS phase2_fail_player_deactivation ON player; DROP FUNCTION IF EXISTS phase2_fail_player_deactivation()");
    }
  });
});
