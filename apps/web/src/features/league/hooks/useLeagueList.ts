import type { ListLeaguesParams } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { listLeagues } from "../../../services/league.service";

function useLeagueList(params: ListLeaguesParams) {
  return useQuery({
    queryKey: ["leagues", params],
    queryFn: () => listLeagues(params),
    retry: false,
  });
}

export { useLeagueList };
export type { HttpError };
