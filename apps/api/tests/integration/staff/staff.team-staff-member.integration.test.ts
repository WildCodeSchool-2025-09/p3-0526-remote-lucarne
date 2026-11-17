import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import client from "../../../database/client";
import prisma from "../../../database/prisma";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL("../../../prisma/migrations/20260914090000_staff_member_assignment_history/migration.sql", import.meta.url));
const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const createTeam = () => prisma.team.create({
  data: { name: `Team ${randomUUID()}` },
});

const createStaffMember = () => prisma.staffMember.create({
  data: {
    firstName: "Alex",
    lastName: "Martin",
    nationality: "France",
  },
});

const createMigrationSchema = async () => {
  const schema = `migration_${randomUUID().replaceAll("-", "")}`;
  const connection = await client.connect();
  await connection.query(`CREATE SCHEMA ${schema}`);
  await connection.query(`SET search_path TO ${schema}, public`);
  await connection.query(`
    CREATE TABLE team (id UUID PRIMARY KEY);
    CREATE TABLE staff_member (
      id UUID PRIMARY KEY,
      team_id UUID NOT NULL REFERENCES team(id),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      job_title VARCHAR(100) NOT NULL,
      is_active BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  return {
    connection,
    cleanup: async () => {
      await connection.query("RESET search_path");
      await connection.query(`DROP SCHEMA ${schema} CASCADE`);
      connection.release();
    },
  };
};

describe("team_staff_member source of truth migration", () => {
  it("backfills staff assignments and removes the direct team relation", async () => {
    const database = await createMigrationSchema();
    const migration = await readFile(migrationPath, "utf8");
    const teamId = randomUUID();
    const staffMemberId = randomUUID();

    try {
      await database.connection.query("INSERT INTO team (id) VALUES ($1)", [teamId]);
      await database.connection.query(
        "INSERT INTO staff_member (id, team_id, first_name, last_name, job_title, is_active, created_at) VALUES ($1, $2, 'Alex', 'Martin', 'COACH', FALSE, $3)",
        [staffMemberId, teamId, "2026-01-02T12:00:00.000Z"],
      );

      await database.connection.query(migration);

      await expect(database.connection.query("SELECT team_id, job_title FROM staff_member"))
        .rejects.toThrow();
      await expect(database.connection.query("SELECT team_id, staff_member_id, job_title, to_char(joined_at, 'YYYY-MM-DD') AS joined_at, left_at FROM team_staff_member"))
        .resolves.toMatchObject({
          rows: [{
            team_id: teamId,
            staff_member_id: staffMemberId,
            job_title: "COACH",
            joined_at: "2026-01-02",
            left_at: null,
          }],
        });
    } finally {
      await database.cleanup();
    }
  });
});

describe("team_staff_member integrity", () => {
  it("retains history and prevents overlapping assignment periods", async () => {
    const [firstTeam, secondTeam, staffMember] = await Promise.all([
      createTeam(),
      createTeam(),
      createStaffMember(),
    ]);

    await prisma.teamStaffMember.create({
      data: {
        teamId: firstTeam.id,
        staffMemberId: staffMember.id,
        jobTitle: "COACH",
        joinedAt: date("2025-01-01"),
        leftAt: date("2025-12-31"),
      },
    });
    await prisma.teamStaffMember.create({
      data: {
        teamId: secondTeam.id,
        staffMemberId: staffMember.id,
        jobTitle: "ASSISTANT_COACH",
        joinedAt: date("2026-01-01"),
      },
    });

    await expect(prisma.teamStaffMember.create({
      data: {
        teamId: firstTeam.id,
        staffMemberId: staffMember.id,
        jobTitle: "COACH",
        joinedAt: date("2026-02-01"),
      },
    })).rejects.toMatchObject({ code: "P2039" });
    await expect(prisma.teamStaffMember.count({
      where: { staffMemberId: staffMember.id },
    })).resolves.toBe(2);
  });

  it("enforces dates and restrictive foreign keys", async () => {
    const [team, staffMember] = await Promise.all([
      createTeam(),
      createStaffMember(),
    ]);

    await expect(prisma.teamStaffMember.create({
      data: {
        teamId: team.id,
        staffMemberId: staffMember.id,
        jobTitle: "COACH",
        joinedAt: date("2026-02-01"),
        leftAt: date("2026-01-31"),
      },
    })).rejects.toThrow();

    await prisma.teamStaffMember.create({
      data: {
        teamId: team.id,
        staffMemberId: staffMember.id,
        jobTitle: "COACH",
        joinedAt: date("2026-01-01"),
      },
    });

    await expect(prisma.team.delete({ where: { id: team.id } }))
      .rejects.toMatchObject({ code: "P2003" });
    await expect(prisma.staffMember.delete({ where: { id: staffMember.id } }))
      .rejects.toMatchObject({ code: "P2003" });
  });
});
