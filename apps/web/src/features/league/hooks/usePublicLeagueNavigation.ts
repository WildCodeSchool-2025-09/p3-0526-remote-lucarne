import { useQuery } from "@tanstack/react-query";
import { listPublicLeagueNavigation } from "../../../services/publicLeague.service";
import { leagueKeys } from "../leagueKeys";

function usePublicLeagueNavigation(enabled = true) {
  return useQuery({
    queryKey: leagueKeys.publicNavigation(),
    queryFn: listPublicLeagueNavigation,
    enabled,
    retry: false,
  });
}

export { usePublicLeagueNavigation };
