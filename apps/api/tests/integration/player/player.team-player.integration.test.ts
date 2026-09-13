import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import client from "../../../database/client";
import prisma from "../../../database/prisma";
import { deactivatePlayerService, getPlayerService, listPlayersService } from "../../../src/features/player/player.service";
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
  it("enforces one open assignment while retaining historical assignments and protecting teams", async () => {
    const [firstTeam, secondTeam, player] = await Promise.all([createTeam(), createTeam(), createPlayer()]);
    await prisma.teamPlayer.create({ data: { teamId: firstTeam.id, playerId: player.id, joinedAt: date("2025-01-01"), leftAt: date("2025-12-31") } });
    await prisma.teamPlayer.create({ data: { teamId: secondTeam.id, playerId: player.id, joinedAt: date("2026-01-01") } });

    await expect(prisma.teamPlayer.create({ data: { teamId: firstTeam.id, playerId: player.id, joinedAt: date("2099-01-01") } })).rejects.toMatchObject({ code: "P2002" });
    await expect(prisma.teamPlayer.create({ data: { teamId: firstTeam.id, playerId: player.id, joinedAt: date("2026-02-01"), leftAt: date("2026-01-31") } })).rejects.toThrow();
    await expect(prisma.team.delete({ where: { id: secondTeam.id } })).rejects.toMatchObject({ code: "P2003" });
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

  it("closes the current assignment, preserves a planned assignment, and is idempotent", async () => {
    const [currentTeam, futureTeam, currentPlayer, futurePlayer] = await Promise.all([createTeam(), createTeam(), createPlayer(), createPlayer()]);
    await prisma.teamPlayer.create({ data: { teamId: currentTeam.id, playerId: currentPlayer.id, joinedAt: date("2026-01-01") } });
    await prisma.teamPlayer.create({ data: { teamId: futureTeam.id, playerId: futurePlayer.id, joinedAt: date("2099-01-01") } });

    const result = await deactivatePlayerService(currentPlayer.id);
    const repeated = await deactivatePlayerService(currentPlayer.id);
    const plannedResult = await deactivatePlayerService(futurePlayer.id);
    expect(result).toMatchObject({ isActive: false, assignments: [{ team: { id: currentTeam.id }, state: "HISTORICAL" }] });
    expect(repeated.version).toBe(result.version);
    expect(plannedResult).toMatchObject({ isActive: false, assignments: [{ team: { id: futureTeam.id }, state: "PLANNED", leftAt: null }] });
  });

  it("rolls back the assignment closure when the player status update fails", async () => {
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
