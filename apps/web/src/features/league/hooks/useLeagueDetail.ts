import { useQuery } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { getLeague } from "../../../services/league.service";

function useLeagueDetail(id: string) {
  return useQuery({
    queryKey: ["league", id],
    queryFn: () => getLeague(id),
    retry: false,
  });
}

export { useLeagueDetail };
export type { HttpError };
