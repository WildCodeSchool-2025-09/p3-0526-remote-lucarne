import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { createPlayerAssignmentInputSchema, createStaffAssignmentInputSchema } from "@lucarne/shared";
import prisma from "../database/prisma";
import client from "../database/client";
import { createPlayerAssignmentService } from "../src/features/player/player.service";
import { createStaffAssignmentService } from "../src/features/staff/staff.service";

const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1] || process.argv[index + 1].startsWith("--")) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
};
const schema = z.object({ rows: z.array(z.object({
  kind: z.enum(["player", "staff"]), personId: z.uuid(), label: z.string().min(1), team: z.string().min(1),
  source: z.url(), startDateOrigin: z.enum(["USER_DEFAULT", "ANNOUNCEMENT_DATE"]),
  endDateOrigin: z.enum(["USER_DEFAULT", "EXPLICIT_LOAN_END"]), input: z.unknown(),
})) });
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/lucarne" || process.env.NODE_ENV === "production") throw new Error("Only local lucarne development data is allowed");
  const directory = resolve(argument("--dir"));
  const apply = process.argv.includes("--apply");
  const raw = JSON.parse(readFileSync(resolve(directory, "assignments-plan.json"), "utf8")) as unknown;
  const plan = schema.parse(raw);
  const snapshot = await prisma.$transaction(async (tx) => ({
    players: await tx.player.findMany({ orderBy: { id: "asc" } }),
    staff: await tx.staffMember.findMany({ orderBy: { id: "asc" } }),
    teams: await tx.team.findMany({ orderBy: { id: "asc" } }),
    playerAssignments: await tx.teamPlayer.findMany({ orderBy: { id: "asc" } }),
    staffAssignments: await tx.teamStaffMember.findMany({ orderBy: { id: "asc" } }),
  }), { isolationLevel: "RepeatableRead" });
  const fingerprint = digest({ raw, snapshot });
  if (apply) {
    if (statSync(resolve(argument("--backup"))).size < 1000) throw new Error("Backup required before assignments");
    const preview = JSON.parse(readFileSync(resolve(directory, "assignments-preview.json"), "utf8")) as { fingerprint: string };
    if (preview.fingerprint !== fingerprint) throw new Error("Plan/database changed: run a fresh preview");
  }
  const operations: { kind: string; label: string; team: string; input: unknown; run: () => Promise<unknown> }[] = [];
  const preserved: { label: string; assignmentId: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const row of plan.rows) {
    const key = `${row.kind}:${row.personId}`;
    if (seen.has(key)) throw new Error(`Multiple destinations for ${row.label}; resolve periods explicitly`);
    seen.add(key);
    const input = row.kind === "player" ? createPlayerAssignmentInputSchema.parse(row.input) : createStaffAssignmentInputSchema.parse(row.input);
    const person = row.kind === "player" ? snapshot.players.find((p) => p.id === row.personId) : snapshot.staff.find((p) => p.id === row.personId);
    const team = snapshot.teams.find((t) => t.id === input.teamId);
    if (!person?.isActive || !team?.isActive || team.name !== row.team) throw new Error(`Inactive/missing person or team for ${row.label}`);
    const periods = row.kind === "player" ? snapshot.playerAssignments.filter((p) => p.playerId === row.personId) : snapshot.staffAssignments.filter((p) => p.staffMemberId === row.personId);
    const joinedAt = new Date(input.joinedAt);
    const leftAt = input.leftAt ? new Date(input.leftAt) : null;
    const overlapping = periods.filter((p) => (p.leftAt === null || joinedAt <= p.leftAt) && (leftAt === null || p.joinedAt <= leftAt));
    if (overlapping.length) {
      if (overlapping.length === 1 && overlapping[0].teamId === input.teamId) {
        preserved.push({ label: row.label, assignmentId: overlapping[0].id, reason: "Existing assignment to the same team preserved, including its exact dates and shirt number." });
        continue;
      }
      throw new Error(`Overlapping assignment to another team for ${row.label}; nothing applied`);
    }
    operations.push({ kind: row.kind, label: row.label, team: row.team, input, run: async () => {
      // Do not use freshly read versions to overwrite a person changed after preflight.
      const current = row.kind === "player" ? await prisma.player.findUniqueOrThrow({ where: { id: row.personId } }) : await prisma.staffMember.findUniqueOrThrow({ where: { id: row.personId } });
      if (current.version !== person.version) throw new Error(`Person changed since preview: ${row.label}`);
      if (row.kind === "player") return createPlayerAssignmentService(row.personId, createPlayerAssignmentInputSchema.parse(input));
      return createStaffAssignmentService(row.personId, createStaffAssignmentInputSchema.parse(input));
    } });
  }
  const report = {
    fingerprint, generatedAt: new Date().toISOString(), mode: apply ? "apply" : "preview", proposed: operations.length,
    players: operations.filter((o) => o.kind === "player").length, staff: operations.filter((o) => o.kind === "staff").length,
    preserved, completed: 0, operations: operations.map(({ kind, label, team, input }) => ({ kind, label, team, input })),
    note: "Default periods explicitly authorized by user. Announcement dates are recorded as such in the source plan; unknown dates are not certified sporting history.",
  };
  const file = resolve(directory, apply ? "assignments-applied.json" : "assignments-preview.json");
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.info(JSON.stringify({ mode: report.mode, players: report.players, staff: report.staff, preserved: preserved.length }));
  if (apply) {
    try { for (const operation of operations) { await operation.run(); report.completed++; } } finally { writeFileSync(file, JSON.stringify(report, null, 2)); }
    console.info(`Completed ${report.completed}/${operations.length} assignments`);
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await client.end(); });
