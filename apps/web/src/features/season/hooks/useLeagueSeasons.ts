import type { ListLeagueSeasonsParams } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import { listLeagueSeasons } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";

function useLeagueSeasons(leagueId: string, params: ListLeagueSeasonsParams = {}) {
  return useQuery({
    queryKey: seasonKeys.leagueList(leagueId, params),
    queryFn: () => listLeagueSeasons(leagueId, params),
    enabled: leagueId.length > 0,
    retry: false,
  });
}

export { useLeagueSeasons };
