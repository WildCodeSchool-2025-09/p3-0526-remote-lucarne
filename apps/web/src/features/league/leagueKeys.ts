import type { ListLeaguesParams } from "@lucarne/shared";

function listParams(params: ListLeaguesParams): ListLeaguesParams {
  return {
    ...params,
    countries: params.countries == null ? undefined : [...params.countries].sort(),
  };
}

const leagueKeys = {
  all: ["league"] as const,
  countries: () => [...leagueKeys.all, "countries"] as const,
  details: () => [...leagueKeys.all, "detail"] as const,
  detail: (leagueId: string) => [...leagueKeys.details(), leagueId] as const,
  lists: () => [...leagueKeys.all, "list"] as const,
  list: (params: ListLeaguesParams) => [...leagueKeys.lists(), listParams(params)] as const,
};

export { leagueKeys };
