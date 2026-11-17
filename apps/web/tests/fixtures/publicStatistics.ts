import type { PublicLeagueDetail } from "@lucarne/shared";

export function emptyPublicStatisticsResponse(url: URL, league: PublicLeagueDetail): Response | undefined {
  const path = /\/seasons\/([^/]+)\/(standings|statistics)$/.exec(url.pathname);
  if (!path || !url.pathname.includes(`/leagues/by-slug/${league.slug}/`)) return undefined;
  const season = league.seasons.find((season) => season.id === path[1]);
  if (!season) return undefined;
  const context = {
    league: { id: league.id, slug: league.slug, name: league.name, country: league.country ?? "France", logoUrl: league.logoUrl },
    season: { id: season.id, name: season.name, startDate: "2026-08-01", endDate: "2027-06-30" },
  };
  const body = path[2] === "standings" ? { ...context, rows: [] } : {
    ...context, completedMatches: 0, totalGoals: 0, goalsPerMatch: null, homeWins: 0, draws: 0, awayWins: 0,
    scorers: { data: [], pagination: { page: Number(url.searchParams.get("page") ?? 1), limit: Number(url.searchParams.get("limit") ?? 20), total: 0, totalPages: 0 } },
  };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}
