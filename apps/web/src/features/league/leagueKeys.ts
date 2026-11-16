import type { ListLeaguesParams, PublicLeagueTeamsQuery } from "@lucarne/shared";

function listParams(params: ListLeaguesParams): ListLeaguesParams {
  return {
    ...params,
    countries: params.countries == null ? undefined : [...params.countries].sort(),
  };
}

const leagueKeys = {
  all: ["league"] as const,
  publicNavigation: () => [...leagueKeys.all, "public", "navigation"] as const,
  publicDetails: () => [...leagueKeys.all, "public", "detail"] as const,
  publicDetail: (leagueSlug: string) => [...leagueKeys.publicDetails(), leagueSlug] as const,
  publicTeams: () => [...leagueKeys.all, "public", "teams"] as const,
  publicTeamList: (leagueSlug: string, seasonId: string, query: PublicLeagueTeamsQuery) =>
    [...leagueKeys.publicTeams(), leagueSlug, seasonId, query] as const,
  countries: () => [...leagueKeys.all, "countries"] as const,
  details: () => [...leagueKeys.all, "detail"] as const,
  detail: (leagueId: string) => [...leagueKeys.details(), leagueId] as const,
  lists: () => [...leagueKeys.all, "list"] as const,
  list: (params: ListLeaguesParams) =>
    [...leagueKeys.lists(), listParams(params)] as const,
};

export { leagueKeys };
