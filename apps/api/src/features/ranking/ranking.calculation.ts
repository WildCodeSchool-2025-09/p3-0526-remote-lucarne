import type { PublicStandingRow, PublicTeamIdentity } from "@lucarne/shared";

export type RankingMatch = { matchPublicId: string; homeTeamId: string | null; awayTeamId: string | null; homeScore: number | null; awayScore: number | null; matchDate: Date | null };
const nameOrder = new Intl.Collator("fr", { sensitivity: "base" });

// Matches arrive newest first. Rebuilding from the snapshot makes corrections idempotent.
export function calculateStandings(teams: PublicTeamIdentity[], matches: RankingMatch[]): PublicStandingRow[] {
  const rows = new Map<string, PublicStandingRow>(teams.map((team) => [team.id, { team, rank: 1, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] }]));
  for (const match of matches) {
    const { homeTeamId, awayTeamId, homeScore, awayScore, matchDate } = match;
    if (!homeTeamId || !awayTeamId || homeScore === null || awayScore === null || !matchDate) throw new Error("Incomplete ranking match");
    for (const [teamId, scored, conceded] of [[homeTeamId, homeScore, awayScore], [awayTeamId, awayScore, homeScore]] as const) {
      const row = rows.get(teamId);
      if (!row) throw new Error("Missing ranking participant");
      const result = scored > conceded ? "WIN" : scored === conceded ? "DRAW" : "LOSS";
      row.played++; row.goalsFor += scored; row.goalsAgainst += conceded;
      if (result === "WIN") row.wins++; else if (result === "DRAW") row.draws++; else row.losses++;
      if (row.form.length < 5) row.form.push({ result, matchPublicId: match.matchPublicId, date: matchDate.toISOString().slice(0, 10) });
    }
  }
  const ordered: PublicStandingRow[] = [...rows.values()].map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst, points: row.wins * 3 + row.draws }));
  ordered.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || nameOrder.compare(a.team.name, b.team.name) || a.team.id.localeCompare(b.team.id));
  return ordered.map((row, index) => ({ ...row, rank: index + 1 }));
}
