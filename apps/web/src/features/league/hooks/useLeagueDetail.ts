import { useQuery } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { getLeague } from "../../../services/league.service";
import { leagueKeys } from "../leagueKeys";

function useLeagueDetail(id: string) {
  return useQuery({
    queryKey: leagueKeys.detail(id),
    enabled: id !== "",
    queryFn: () => getLeague(id),
    retry: false,
  });
}

export { useLeagueDetail };

export type { HttpError };
