import prisma from "../../../database/prisma";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import type { MatchImportApply, MatchImportDocument } from "@lucarne/shared";
import { buildMatchImportPlan } from "./season-match-import.plan";

const loadImportContext = (transaction: Prisma.TransactionClient, leagueId: string, seasonId: string) => transaction.leagueSeason.findUnique({
  where: { leagueId_seasonId: { leagueId, seasonId } },
  select: {
    id: true, matchdayCount: true, matchesPerMatchday: true,
    league: { select: { id: true, name: true, version: true, isActive: true } },
    season: { select: { id: true, name: true, startDate: true, endDate: true, version: true } },
    participations: {
      orderBy: { teamId: "asc" },
      select: { status: true, team: { select: { id: true, name: true, isActive: true } } },
    },
    matchdays: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      select: {
        id: true, number: true, isActive: true, startDate: true, endDate: true,
        gameMatches: {
          orderBy: { id: "asc" },
          select: {
            id: true, matchPublicId: true, version: true, isActive: true, isPublished: true,
            homeTeamId: true, awayTeamId: true, matchDate: true, startTime: true,
            stadium: true, homeScore: true, awayScore: true, status: true,
            _count: { select: { matchEvents: true } },
          },
        },
      },
    },
  },
});

type MatchImportContext = NonNullable<Awaited<ReturnType<typeof loadImportContext>>>;

const previewSeasonMatchImport = (leagueId: string, seasonId: string, document: MatchImportDocument) => prisma.$transaction(async (transaction) => {
  const context = await loadImportContext(transaction, leagueId, seasonId);
  if (!context) throw new AppError(404, "RESOURCE_NOT_FOUND", "Cette saison n’est pas associée à cette ligue.");
  return buildMatchImportPlan(context, document).preview;
}, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

const applySeasonMatchImport = (leagueId: string, seasonId: string, input: MatchImportApply) => prisma.$transaction(async (transaction) => {
  await transaction.$executeRaw`SET LOCAL statement_timeout = '10s'`;
  // Lock existing resources in a stable order. Serializable also protects against
  // inserted slots/participants and concurrent period or registration changes.
  await transaction.$queryRaw`SELECT id FROM season WHERE id = ${seasonId}::uuid FOR UPDATE`;
  await transaction.$queryRaw`SELECT id FROM league WHERE id = ${leagueId}::uuid FOR UPDATE`;
  const editions = await transaction.$queryRaw<{ id: string }[]>`SELECT id FROM league_season WHERE league_id = ${leagueId}::uuid AND season_id = ${seasonId}::uuid FOR UPDATE`;
  const edition = editions[0];
  if (!edition) throw new AppError(404, "RESOURCE_NOT_FOUND", "Cette saison n’est pas associée à cette ligue.");
  await transaction.$queryRaw`SELECT id FROM matchday WHERE league_season_id = ${edition.id}::uuid ORDER BY id FOR UPDATE`;
  await transaction.$queryRaw`SELECT m.id FROM game_match m JOIN matchday d ON d.id = m.matchday_id WHERE d.league_season_id = ${edition.id}::uuid ORDER BY m.id FOR UPDATE OF m`;
  await transaction.$queryRaw`SELECT t.id FROM team t JOIN participation p ON p.team_id = t.id WHERE p.league_season_id = ${edition.id}::uuid ORDER BY t.id FOR UPDATE OF t`;
  await transaction.$queryRaw`SELECT team_id FROM participation WHERE league_season_id = ${edition.id}::uuid ORDER BY team_id FOR UPDATE`;
  const context = await loadImportContext(transaction, leagueId, seasonId);
  if (!context) throw new AppError(404, "RESOURCE_NOT_FOUND", "Association introuvable.");
  const plan = buildMatchImportPlan(context, input.document);
  if (plan.preview.snapshot !== input.snapshot) throw new AppError(409, "RESOURCE_VERSION_CONFLICT", "Le calendrier ou le fichier a changé. Analysez à nouveau le fichier avant l’import.");
  for (const change of plan.changes) {
    const updated = await transaction.gameMatch.updateMany({
      where: { id: change.id, version: change.version, isActive: true },
      data: { ...change.data, version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new AppError(409, "RESOURCE_VERSION_CONFLICT", "Un emplacement a changé. Analysez à nouveau le fichier.");
  }
  return { summary: plan.preview.summary };
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });

export { applySeasonMatchImport, previewSeasonMatchImport };
export type { MatchImportContext };
