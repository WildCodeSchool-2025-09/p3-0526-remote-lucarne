import type { ListLeaguesParams } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { listLeagues } from "../../../services/league.service";
import { leagueKeys } from "../leagueKeys";

function useLeagueList(params: ListLeaguesParams) {
  return useQuery({
    queryKey: leagueKeys.list(params),
    queryFn: () => listLeagues(params),
    retry: false,
  });
}

export { useLeagueList };

export type { HttpError };
