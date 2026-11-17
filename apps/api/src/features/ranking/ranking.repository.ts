import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { publicMatchVisibility } from "../match/match.repository";
import { publicPlayerAssignmentWhere } from "../player/player.public.repository";
import { publicEditionSelect } from "../season/season.public.repository";
import { publicTeamSelect } from "../team/team.public.repository";

export function eligibleEditionMatches(leagueSeasonId: string): Prisma.GameMatchWhereInput {
  const registeredTeam = { isActive: true, participations: { some: { leagueSeasonId, status: "REGISTERED" } } };
  return { AND: [publicMatchVisibility, { status: "COMPLETED", homeScore: { not: null }, awayScore: { not: null },
    matchday: { leagueSeasonId }, homeTeam: registeredTeam, awayTeam: registeredTeam,
  }] };
}
const visiblePlayer = (date: Date): Prisma.PlayerWhereInput => ({ isActive: true, teamPlayers: { some: publicPlayerAssignmentWhere(date) } });

export function findPublicEditionSnapshot(where: { leagueSlug?: string; leagueId?: string; seasonId: string }, date: Date, includeScorers = false) {
  return prisma.$transaction(async (transaction) => {
    const edition = await transaction.leagueSeason.findFirst({
      where: { seasonId: where.seasonId, leagueId: where.leagueId, league: { isActive: true, slug: where.leagueSlug } },
      select: { id: true, ...publicEditionSelect, participations: {
        where: { status: "REGISTERED", team: { isActive: true } }, select: { team: { select: publicTeamSelect } }, orderBy: { teamId: "asc" },
      } },
    });
    if (!edition) return null;
    const matches = await transaction.gameMatch.findMany({
      where: eligibleEditionMatches(edition.id),
      select: { matchPublicId: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, matchDate: true },
      orderBy: [{ matchDate: "desc" }, { startTime: "desc" }, { id: "asc" }],
    });
    const goals = includeScorers ? await transaction.matchEvent.groupBy({ by: ["playerId"],
      where: { eventType: "GOAL", gameMatch: eligibleEditionMatches(edition.id), player: visiblePlayer(date) }, _count: { _all: true },
    }) : [];
    const players = goals.length ? await transaction.player.findMany({
      where: { id: { in: goals.map((goal) => goal.playerId) }, ...visiblePlayer(date) },
      select: { id: true, firstName: true, lastName: true, pictureUrl: true, teamPlayers: {
        where: publicPlayerAssignmentWhere(date), select: { team: { select: publicTeamSelect } }, orderBy: [{ joinedAt: "desc" }, { id: "asc" }], take: 1,
      } },
    }) : [];
    return { edition, matches, goals, players };
  }, { isolationLevel: "RepeatableRead" });
}

export function findPublicPlayerStatistics(playerId: string, leagueId: string, seasonId: string, date: Date) {
  return prisma.$transaction(async (transaction) => {
    const edition = await transaction.leagueSeason.findFirst({ where: { leagueId, seasonId, league: { isActive: true } }, select: { id: true, ...publicEditionSelect } });
    if (!edition) return null;
    const player = await transaction.player.findFirst({ where: { id: playerId, ...visiblePlayer(date) }, select: { id: true } });
    if (!player) return null;
    const goals = await transaction.matchEvent.count({ where: { playerId, eventType: "GOAL", gameMatch: eligibleEditionMatches(edition.id) } });
    return { edition, playerId, goals };
  }, { isolationLevel: "RepeatableRead" });
}

export const findPublicMatchEvents = (matchPublicId: string, date: Date) => prisma.$transaction((transaction) => transaction.gameMatch.findFirst({
  where: { matchPublicId, ...publicMatchVisibility }, select: { matchEvents: {
    where: { eventType: "GOAL", player: visiblePlayer(date) }, orderBy: [{ minute: "asc" }, { id: "asc" }],
    select: { id: true, minute: true, player: { select: { id: true, firstName: true, lastName: true, pictureUrl: true } } },
  } },
}), { isolationLevel: "RepeatableRead" });
