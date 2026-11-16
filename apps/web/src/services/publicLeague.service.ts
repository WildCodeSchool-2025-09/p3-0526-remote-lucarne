import { publicLeagueDetailSchema, publicLeagueNavigationResponseSchema, publicLeagueTeamsResponseSchema } from "@lucarne/shared";
import type { PublicLeagueTeamsQuery } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function listPublicLeagueNavigation() {
  return publicLeagueNavigationResponseSchema.parse(await httpClient.get<unknown>("/leagues/navigation"));
}

async function getPublicLeague(leagueSlug: string) {
  return publicLeagueDetailSchema.parse(await httpClient.get<unknown>(`/leagues/by-slug/${encodeURIComponent(leagueSlug)}`));
}

async function listPublicLeagueTeams(leagueSlug: string, seasonId: string, query: PublicLeagueTeamsQuery) {
  return publicLeagueTeamsResponseSchema.parse(await httpClient.get<unknown>(
    `/leagues/by-slug/${encodeURIComponent(leagueSlug)}/seasons/${encodeURIComponent(seasonId)}/teams`, { query },
  ));
}

export { getPublicLeague, listPublicLeagueNavigation, listPublicLeagueTeams };
