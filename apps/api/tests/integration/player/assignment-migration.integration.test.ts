import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import client from "../../../database/client";

const migration = () => readFile(new URL("../../../prisma/migrations/20261005160000_inclusive_assignment_periods/migration.sql", import.meta.url), "utf8");
const fixture = async () => {
  const schema = `assignment_${randomUUID().replaceAll("-", "")}`;
  const connection = await client.connect();
  await connection.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}, public;
    CREATE TABLE team_player (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), player_id UUID NOT NULL, joined_at DATE NOT NULL, left_at DATE,
      CONSTRAINT chk_team_player_dates CHECK (left_at IS NULL OR left_at >= joined_at),
      CONSTRAINT excl_team_player_assignment_period EXCLUDE USING gist (player_id WITH =, daterange(joined_at, left_at, '[)') WITH &&));
    CREATE TABLE team_staff_member (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), staff_member_id UUID NOT NULL, joined_at DATE NOT NULL, left_at DATE,
      CONSTRAINT chk_team_staff_member_dates CHECK (left_at IS NULL OR left_at >= joined_at));
    CREATE UNIQUE INDEX uq_active_team_staff_member_per_staff_member ON team_staff_member(staff_member_id) WHERE left_at IS NULL;
  `);
  return { connection, cleanup: async () => {
    await connection.query("ROLLBACK; RESET search_path");
    await connection.query(`DROP SCHEMA ${schema} CASCADE`);
    connection.release();
  } };
};
describe("inclusive assignment migration", () => {
  it("preserves covered days and prevents inclusive overlaps for both resources", async () => {
    const f = await fixture();
    const person = randomUUID();
    try {
      await f.connection.query("INSERT INTO team_player(player_id, joined_at, left_at) VALUES ($1, '2026-01-01', '2026-02-01'), ($1, '2026-02-01', NULL)", [person]);
      await f.connection.query("INSERT INTO team_staff_member(staff_member_id, joined_at, left_at) VALUES ($1, '2026-01-01', '2026-02-01'), ($1, '2026-02-01', NULL)", [person]);
      await f.connection.query(await migration());
      for (const [table, column] of [["team_player", "player_id"], ["team_staff_member", "staff_member_id"]]) {
        const result = await f.connection.query(`SELECT left_at::text FROM ${table} ORDER BY joined_at`);
        expect(result.rows).toEqual([{ left_at: "2026-01-31" }, { left_at: null }]);
        await expect(f.connection.query(`INSERT INTO ${table}(${column}, joined_at, left_at) VALUES ($1, '2026-01-31', '2026-02-02')`, [person])).rejects.toMatchObject({ code: "23P01" });
        await expect(f.connection.query(`INSERT INTO ${table}(${column}, joined_at, left_at) VALUES ($1, '2025-01-01', '2025-01-01')`, [randomUUID()])).rejects.toMatchObject({ code: "23514" });
      }
    } finally { await f.cleanup(); }
  });
  it.each(["short", "overlap"])("refuses %s legacy data atomically", async (kind) => {
    const f = await fixture();
    try {
      if (kind === "short") await f.connection.query("INSERT INTO team_player(player_id, joined_at, left_at) VALUES ($1, '2026-01-01', '2026-01-02')", [randomUUID()]);
      else await f.connection.query("INSERT INTO team_staff_member(staff_member_id, joined_at, left_at) VALUES ($1, '2026-01-01', '2026-03-01'), ($1, '2026-02-01', '2026-04-01')", [randomUUID()]);
      await expect(f.connection.query(await migration())).rejects.toThrow("migration refused");
      await f.connection.query("ROLLBACK");
      const constraint = await f.connection.query<{ definition: string }>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname = 'chk_team_player_dates' AND conrelid = 'team_player'::regclass");
      expect(constraint.rows[0].definition).toContain("left_at >= joined_at");
      if (kind === "short") {
        const dates = await f.connection.query<{ left_at: string }>("SELECT left_at::text FROM team_player");
        expect(dates.rows[0].left_at).toBe("2026-01-02");
      }
    } finally { await f.cleanup(); }
  });
});
