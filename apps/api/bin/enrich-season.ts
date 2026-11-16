import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPlayerInputSchema, createStaffMemberInputSchema, createTeamInputSchema, matchImportDocumentSchema, updateMatchInputSchema } from "@lucarne/shared";
import prisma from "../database/prisma";
import client from "../database/client";
import { createTeamService } from "../src/features/team/team.service";
import { createParticipationService } from "../src/features/participation/participation.service";
import { createPlayerService } from "../src/features/player/player.service";
import { createStaffMemberService } from "../src/features/staff/staff.service";
import { getMatchService, publishMatchService, updateMatchService, updateMatchResultService, updateMatchStatusService } from "../src/features/match/match.service";
import { previewSeasonMatchImportService, applySeasonMatchImportService } from "../src/features/season/season-match-import.service";
import { enrichmentSchema, normalizeIdentity, sameIdentity, validateCalendar } from "./lib/season-enrichment";

const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1] || process.argv[index + 1].startsWith("--")) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
};
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const dateOnly = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
type Operation = { kind: string; label: string; run: () => Promise<unknown> };

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (!new Set(["localhost", "127.0.0.1", "[::1]"]).has(target.hostname) || target.pathname !== "/lucarne" || process.env.NODE_ENV === "production")
    throw new Error("This one-season enrichment is restricted to local lucarne development data");
  const dataFile = resolve(argument("--data"));
  const reportDirectory = resolve(argument("--out"));
  const registryFile = resolve(reportDirectory, "player-source-map.json");
  const registry = existsSync(registryFile) ? JSON.parse(readFileSync(registryFile, "utf8")) as Record<string, string> : {};
  const apply = process.argv.includes("--apply");
  const data = enrichmentSchema.parse(JSON.parse(readFileSync(dataFile, "utf8")));
  validateCalendar(data);
  const snapshot = await prisma.$transaction(async (tx) => ({
    leagues: await tx.league.findMany({ orderBy: { id: "asc" } }),
    seasons: await tx.season.findMany({ orderBy: { id: "asc" } }),
    editions: await tx.leagueSeason.findMany({ orderBy: { id: "asc" } }),
    teams: await tx.team.findMany({ orderBy: { id: "asc" } }),
    participations: await tx.participation.findMany({ orderBy: [{ teamId: "asc" }, { leagueSeasonId: "asc" }] }),
    days: await tx.matchday.findMany({ orderBy: { id: "asc" } }),
    matches: await tx.gameMatch.findMany({ orderBy: { id: "asc" }, include: { _count: { select: { matchEvents: true } } } }),
    players: await tx.player.findMany({ orderBy: { id: "asc" } }),
    assignments: await tx.teamPlayer.findMany({ orderBy: { id: "asc" } }),
    events: await tx.matchEvent.findMany({ orderBy: { id: "asc" } }),
    staff: await tx.staffMember.findMany({ orderBy: { id: "asc" } }),
    staffAssignments: await tx.teamStaffMember.findMany({ orderBy: { id: "asc" } }),
  }), { isolationLevel: "RepeatableRead" });
  const fingerprint = hash(snapshot);
  const dataFingerprint = hash({ data, registry });
  if (apply) {
    const backup = resolve(argument("--backup"));
    if (!existsSync(backup) || statSync(backup).size < 1000) throw new Error("A nonempty pre-import backup is required");
    const preview = JSON.parse(readFileSync(resolve(reportDirectory, "preview.json"), "utf8")) as { fingerprint: string; dataFingerprint: string };
    if (preview.fingerprint !== fingerprint || preview.dataFingerprint !== dataFingerprint) throw new Error("Data or database changed: generate a fresh preview");
  }
  const season = snapshot.seasons.find((row) => row.name === data.season);
  if (!season) throw new Error("Expected existing global season was not found; no calendar will be generated blindly");
  const editions = new Map<"d1" | "d2", typeof snapshot.editions[number]>();
  for (const division of ["d1", "d2"] as const) {
    const league = snapshot.leagues.find((row) => row.name === (division === "d1" ? "Arkema Première Ligue" : "Seconde Ligue") && row.country === "France");
    const edition = snapshot.editions.find((row) => row.leagueId === league?.id && row.seasonId === season.id);
    if (!league?.isActive || !edition || edition.matchdayCount !== 22 || edition.matchesPerMatchday !== (division === "d1" ? 6 : 5))
      throw new Error(`Unexpected existing ${division} configuration`);
    editions.set(division, edition);
  }
  const issues: { kind: string; label: string; detail: string }[] = [];
  const blockedMatches = new Set<string>();
  const expectedVersions = new Map(snapshot.matches.map((match) => [match.id, match.version]));
  const expectedMatch = async (id: string) => {
    const current = await getMatchService(id);
    if (current.version !== expectedVersions.get(id)) throw new Error(`Match changed since preview: ${id}`);
    return current;
  };
  const operations: Operation[] = [];
  const add = (kind: string, label: string, run: Operation["run"]) => operations.push({ kind, label, run });
  const teams = new Map<string, { id: string; isActive: boolean }>();
  for (const source of data.teams) {
    const candidates = snapshot.teams.filter((team) => normalizeIdentity(team.name) === normalizeIdentity(source.name));
    if (candidates.length > 1 || (candidates[0] && !candidates[0].isActive)) throw new Error(`Ambiguous or inactive team: ${source.name}`);
    if (candidates[0]) teams.set(source.name, candidates[0]);
    else {
      teams.set(source.name, { id: `pending:${source.name}`, isActive: true });
      const input = createTeamInputSchema.parse({ name: source.name, ...(source.logoUrl ? { logoUrl: source.logoUrl } : {}) });
      add("createTeam", source.name, async () => teams.set(source.name, await createTeamService(input)));
    }
    const teamId = teams.get(source.name)!.id;
    const edition = editions.get(source.division)!;
    const participation = snapshot.participations.find((row) => row.teamId === teamId && row.leagueSeasonId === edition.id);
    if (participation && participation.status !== "REGISTERED") throw new Error(`Withdrawn participation must be resolved explicitly: ${source.name}`);
    if (!participation) add("registerTeam", source.name, () => createParticipationService(edition.id, { teamId: teams.get(source.name)!.id }));
  }

  // Import fills empty slots only; existing matches keep their public IDs and history.
  for (const division of ["d1", "d2"] as const) {
    const edition = editions.get(division)!;
    const document = matchImportDocumentSchema.parse({
      ligue: division === "d1" ? "Arkema Première Ligue" : "Seconde Ligue", saison: data.season,
      dateReleve: data.collectedOn, timezone: "Europe/Paris",
      matchs: data.matches.filter((m) => m.division === division).map((m) => ({
        journee: m.day, domicile: m.home, exterieur: m.away, date: m.date, heureParis: m.time,
        stade: m.stadium, etat: m.status, scoreDomicile: m.homeScore, scoreExterieur: m.awayScore,
        dateConfirmee: Boolean(m.date && m.time), datePrevisionnelle: m.provisionalDate,
        publicationDemandee: Boolean(m.date && m.time), pretPourPublication: Boolean(m.date && m.time), sourceCalendrier: m.source,
      })),
    });
    writeFileSync(resolve(reportDirectory, `${division}-matches.json`), JSON.stringify(document, null, 2));
    const days = snapshot.days.filter((day) => day.leagueSeasonId === edition.id && day.isActive);
    if (days.length !== 22) throw new Error(`Unexpected ${division} matchdays`);
    let empty = 0;
    for (const day of days) {
      const matches = snapshot.matches.filter((match) => match.matchdayId === day.id && match.isActive);
      if (matches.length !== edition.matchesPerMatchday) throw new Error(`Unexpected ${division} slots J${day.number}`);
      const sourceRows = data.matches.filter((row) => row.division === division && row.day === day.number);
      for (const match of matches) {
        const isEmpty = !match.homeTeamId && !match.awayTeamId && !match.matchDate && !match.startTime && !match.stadium && match.homeScore === null
          && match.awayScore === null && !match.isPublished && match.status === "SCHEDULED" && !match._count.matchEvents;
        if (isEmpty) { empty++; continue; }
        const source = sourceRows.find((row) => teams.get(row.home)!.id === match.homeTeamId && teams.get(row.away)!.id === match.awayTeamId);
        if (!source) throw new Error(`Partially filled/unmatched slot: ${match.id}`);
        const label = `${division} J${day.number} ${source.home} – ${source.away}`;
        const programming: Record<string, string> = {};
        let incompatible = false;
        for (const [field, current, next] of [
          ["matchDate", dateOnly(match.matchDate), source.date],
          ["startTime", match.startTime?.toISOString().slice(11, 16) ?? null, source.time],
          ["stadium", match.stadium, source.stadium],
        ] as const) {
          if (next && !current) programming[field] = next;
          else if (next && current && normalizeIdentity(next) !== normalizeIdentity(current)) {
            issues.push({ kind: "preservedProgrammingConflict", label, detail: `${field}: existing=${current}; source=${next}` });
            if (field !== "stadium") incompatible = true;
          }
        }
        if (incompatible) { blockedMatches.add(match.id); continue; }
        if (Object.keys(programming).length) add("completeProgramming", label, async () => {
          const current = await expectedMatch(match.id);
          const updated = await updateMatchService(match.id, updateMatchInputSchema.parse({ ...programming, version: current.version }));
          expectedVersions.set(match.id, updated.version);
        });
        if (source.date && source.time && !match.isPublished) add("publishMatch", label, async () => {
          const current = await expectedMatch(match.id);
          expectedVersions.set(match.id, (await publishMatchService(match.id, { version: current.version })).version);
        });
        if (source.status === "COMPLETED") {
          const differs = source.homeScore !== match.homeScore || source.awayScore !== match.awayScore;
          if (match.status === "COMPLETED" && differs) {
            issues.push({ kind: "preservedResultConflict", label, detail: `existing=${match.homeScore}-${match.awayScore}; source=${source.homeScore}-${source.awayScore}` });
            blockedMatches.add(match.id);
            continue;
          }
          if (differs) add("updateResult", label, async () => {
            const current = await expectedMatch(match.id);
            expectedVersions.set(match.id, (await updateMatchResultService(match.id, { version: current.version, homeScore: source.homeScore!, awayScore: source.awayScore! })).version);
          });
          if (match.status !== "COMPLETED") add("completeMatch", label, async () => {
            const current = await expectedMatch(match.id);
            expectedVersions.set(match.id, (await updateMatchStatusService(match.id, { version: current.version, status: "COMPLETED" })).version);
          });
        }
      }
    }
    if (empty) add("importEmptySlots", `${division}: ${empty}`, async () => {
      const preview = await previewSeasonMatchImportService(edition.leagueId, season.id, document);
      writeFileSync(resolve(reportDirectory, `${division}-import-preview.json`), JSON.stringify(preview, null, 2));
      return applySeasonMatchImportService(edition.leagueId, season.id, { document, snapshot: preview.snapshot });
    });
  }

  const players = new Map<string, string>();
  for (const source of [...new Map(data.players.map((player) => [player.sourceId, player])).values()]) {
    const label = `${source.firstName} ${source.lastName}`;
    const boundPlayer = snapshot.players.find((row) => row.id === registry[source.sourceId]);
    if (boundPlayer && sameIdentity({ ...boundPlayer, birthday: dateOnly(boundPlayer.birthday) }, source)) {
      players.set(source.sourceId, boundPlayer.id);
      continue;
    }
    const matchingNames = snapshot.players.filter((player) => normalizeIdentity(player.firstName) === normalizeIdentity(source.firstName)
      && normalizeIdentity(player.lastName) === normalizeIdentity(source.lastName));
    const reversed = snapshot.players.filter((player) => dateOnly(player.birthday) === source.birthday && source.birthday !== null && (
      (normalizeIdentity(player.firstName) === normalizeIdentity(source.lastName) && normalizeIdentity(player.lastName) === normalizeIdentity(source.firstName))
      || (source.displayName && normalizeIdentity(`${player.lastName} ${player.firstName}`) === normalizeIdentity(source.displayName))));
    if (source.birthday !== null && matchingNames.length === 1 && sameIdentity({ ...matchingNames[0], birthday: dateOnly(matchingNames[0].birthday) }, source)) {
      players.set(source.sourceId, matchingNames[0].id);
    } else if (reversed.length === 1 && !matchingNames.length) {
      players.set(source.sourceId, reversed[0].id);
      issues.push({ kind: "preservedReversedName", label, detail: `Existing identity ${reversed[0].id} reused; first/last name reversal requires a separate correction.` });
    } else if (matchingNames.length || reversed.length) {
      issues.push({ kind: "ambiguousPlayer", label, detail: "Name already exists with absent/conflicting birthday or multiple candidates; no automatic merge/create." });
    } else {
      const input = createPlayerInputSchema.parse({ firstName: source.firstName, lastName: source.lastName, birthday: source.birthday, nationality: source.nationality, position: source.position });
      players.set(source.sourceId, `pending:${source.sourceId}`);
      add("createPlayer", label, async () => players.set(source.sourceId, (await createPlayerService(input)).id));
    }
  }
  for (const source of data.staff ?? []) {
    const label = `${source.firstName} ${source.lastName}`;
    const existing = snapshot.staff.filter((row) => normalizeIdentity(row.firstName) === normalizeIdentity(source.firstName) && normalizeIdentity(row.lastName) === normalizeIdentity(source.lastName));
    if (existing.length > 1 || (existing[0] && normalizeIdentity(existing[0].nationality) !== normalizeIdentity(source.nationality))) {
      issues.push({ kind: "ambiguousStaff", label, detail: "Conflicting existing staff identity preserved." });
    } else if (!existing.length) {
      const input = createStaffMemberInputSchema.parse({ firstName: source.firstName, lastName: source.lastName, nationality: source.nationality });
      add("createStaff", label, () => createStaffMemberService(input));
    }
  }
  // Events have no management service yet. Lock each match and preserve existing events.
  // Refuse events for a result that was not successfully imported/confirmed.
  for (const sourceMatch of data.matches.filter((row) => row.status === "COMPLETED")) {
    const goals = data.goals.filter((goal) => goal.sourceMatchId === sourceMatch.sourceMatchId && players.has(goal.playerSourceId));
    if (!goals.length) continue;
    if (goals.length > sourceMatch.homeScore! + sourceMatch.awayScore!) throw new Error("Goal count exceeds the verified result");
    const edition = editions.get(sourceMatch.division)!;
    const day = snapshot.days.find((row) => row.leagueSeasonId === edition.id && row.number === sourceMatch.day)!;
    const before = snapshot.matches.find((row) => row.matchdayId === day.id && row.homeTeamId === teams.get(sourceMatch.home)!.id && row.awayTeamId === teams.get(sourceMatch.away)!.id);
    if (before && blockedMatches.has(before.id)) {
      issues.push({ kind: "goalsDeferred", label: sourceMatch.sourceMatchId, detail: "Programming/result conflict preserved; no goals imported for this match." });
      continue;
    }
    const missing = goals.some((goal) => !players.get(goal.playerSourceId) || !before || !snapshot.events.some((event) => event.matchId === before.id && event.playerId === players.get(goal.playerSourceId) && event.minute === goal.minute && event.eventType === "GOAL"));
    if (!missing) continue;
    add("addVerifiedGoals", `${sourceMatch.home} – ${sourceMatch.away} J${sourceMatch.day}`, async () => prisma.$transaction(async (tx) => {
      const match = await tx.gameMatch.findFirst({ where: { matchdayId: day.id, homeTeamId: teams.get(sourceMatch.home)!.id, awayTeamId: teams.get(sourceMatch.away)!.id, isActive: true } });
      if (!match) throw new Error("Goal match missing after import");
      await tx.$queryRaw`SELECT id FROM game_match WHERE id = ${match.id}::uuid FOR UPDATE`;
      if (!match.isPublished || match.status !== "COMPLETED" || match.homeScore !== sourceMatch.homeScore || match.awayScore !== sourceMatch.awayScore) {
        issues.push({ kind: "goalsDeferred", label: sourceMatch.sourceMatchId, detail: "Existing result differs or match is not published/completed." }); return;
      }
      const existing = await tx.matchEvent.findMany({ where: { matchId: match.id } });
      const insert: { matchId: string; playerId: string; eventType: string; minute: number }[] = [];
      for (const goal of goals) {
        const playerId = players.get(goal.playerSourceId);
        if (!playerId) { issues.push({ kind: "goalPlayerMissing", label: goal.playerSourceId, detail: goal.source }); continue; }
        if (!existing.some((row) => row.playerId === playerId && row.minute === goal.minute && row.eventType === "GOAL")
          && !insert.some((row) => row.playerId === playerId && row.minute === goal.minute)) insert.push({ matchId: match.id, playerId, minute: goal.minute, eventType: "GOAL" });
      }
      if (existing.length + insert.length > match.homeScore! + match.awayScore!) throw new Error("Existing/new goal total exceeds result; no events changed for this match");
      if (insert.length) await tx.matchEvent.createMany({ data: insert });
    }, { isolationLevel: "Serializable" }));
  }

  const report = {
    mode: apply ? "apply" : "preview", fingerprint, dataFingerprint, target: { host: target.hostname, database: target.pathname.slice(1) },
    collectedOn: data.collectedOn, generatedAt: new Date().toISOString(), issues,
    counts: Object.fromEntries([...new Set(operations.map((op) => op.kind))].map((kind) => [kind, operations.filter((op) => op.kind === kind).length])),
    operations: operations.map(({ kind, label }) => ({ kind, label })), completed: 0,
    limitations: ["Unattested player/staff assignment dates are never invented.", "Existing contradictory values are preserved and reported.", "Unknown/own-goal events and ambiguous player identities are deferred.", "No ranking rule or schema change is included."],
  };
  const reportFile = resolve(reportDirectory, apply ? "applied.json" : "preview.json");
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.info(JSON.stringify({ mode: report.mode, counts: report.counts, issues: issues.length, report: reportFile }));
  if (apply) {
    try {
      for (const operation of operations) { await operation.run(); report.completed++; }
    } finally {
      writeFileSync(reportFile, JSON.stringify(report, null, 2));
      writeFileSync(registryFile, JSON.stringify(Object.fromEntries([...players].filter(([, id]) => !id.startsWith("pending:"))), null, 2));
    }
    console.info(`Completed ${report.completed}/${operations.length} operations`);
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await client.end(); });
