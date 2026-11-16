import type { PublicScorer, PublicStatisticsEditionQuery, PublicStatisticsQuery } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { assignmentDate } from "../../utils/assignmentPeriod";
import { publicPagination } from "../../utils/publicPagination";
import { calculateStandings } from "./ranking.calculation";
import { findPublicEditionSnapshot, findPublicMatchEvents, findPublicPlayerStatistics } from "./ranking.repository";

const missing = () => new AppError(404, "RESOURCE_NOT_FOUND", "Ces données ne sont pas disponibles.");
const context = (edition: { league: unknown; season: { id: string; name: string; startDate: Date; endDate: Date } }) => ({
  league: edition.league, season: { ...edition.season, startDate: edition.season.startDate.toISOString().slice(0, 10), endDate: edition.season.endDate.toISOString().slice(0, 10) },
});
async function snapshot(leagueSlug: string, seasonId: string, includeScorers = false) {
  const data = await findPublicEditionSnapshot({ leagueSlug, seasonId }, assignmentDate(), includeScorers);
  if (!data) throw missing();
  return data;
}
export async function getPublicStandingsService(leagueSlug: string, seasonId: string) {
  const data = await snapshot(leagueSlug, seasonId);
  return { ...context(data.edition), rows: calculateStandings(data.edition.participations.map(({ team }) => team), data.matches) };
}
export async function getPublicLeagueStatisticsService(leagueSlug: string, seasonId: string, query: PublicStatisticsQuery) {
  const data = await snapshot(leagueSlug, seasonId, true);
  const goalsByPlayer = new Map(data.goals.map((goal) => [goal.playerId, goal._count._all]));
  const scorers: PublicScorer[] = data.players.map(({ teamPlayers, ...player }) => {
    const assignment = teamPlayers[0]; if (!assignment) throw new Error("Missing scorer affiliation");
    return { rank: 1, player: { ...player, team: assignment.team }, goals: goalsByPlayer.get(player.id) ?? 0 };
  });
  const names = new Intl.Collator("fr", { sensitivity: "base" });
  scorers.sort((a, b) => b.goals - a.goals || names.compare(a.player.lastName, b.player.lastName) || names.compare(a.player.firstName, b.player.firstName) || a.player.id.localeCompare(b.player.id));
  scorers.forEach((row, index) => { row.rank = index + 1; });
  let totalGoals = 0; let homeWins = 0; let draws = 0; let awayWins = 0;
  for (const match of data.matches) {
    if (match.homeScore === null || match.awayScore === null) throw new Error("Incomplete statistics match");
    totalGoals += match.homeScore + match.awayScore;
    if (match.homeScore > match.awayScore) homeWins++; else if (match.homeScore === match.awayScore) draws++; else awayWins++;
  }
  return { ...context(data.edition), completedMatches: data.matches.length, totalGoals, goalsPerMatch: data.matches.length ? totalGoals / data.matches.length : null,
    homeWins, draws, awayWins, scorers: publicPagination(scorers.slice((query.page - 1) * query.limit, query.page * query.limit), scorers.length, query),
  };
}
export async function getPublicTeamStatisticsService(teamId: string, query: PublicStatisticsEditionQuery) {
  const data = await findPublicEditionSnapshot(query, assignmentDate());
  if (!data) throw missing();
  const row = calculateStandings(data.edition.participations.map(({ team }) => team), data.matches).find((row) => row.team.id === teamId);
  if (!row) throw missing();
  return { ...context(data.edition), ...row };
}
export async function getPublicPlayerStatisticsService(playerId: string, query: PublicStatisticsEditionQuery) {
  const data = await findPublicPlayerStatistics(playerId, query.leagueId, query.seasonId, assignmentDate());
  if (!data) throw missing();
  return { ...context(data.edition), playerId, goals: data.goals };
}
export async function getPublicMatchEventsService(matchPublicId: string) {
  const data = await findPublicMatchEvents(matchPublicId, assignmentDate());
  if (!data) throw missing();
  return data.matchEvents;
}
