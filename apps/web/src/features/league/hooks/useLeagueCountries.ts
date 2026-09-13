import { useQuery } from "@tanstack/react-query";
import { listLeagueCountries } from "../../../services/league.service";
import { leagueKeys } from "../leagueKeys";

function useLeagueCountries() {
  return useQuery({
    queryKey: leagueKeys.countries(),
    queryFn: listLeagueCountries,
    staleTime: 5 * 60 * 1000,
  });
}

export { useLeagueCountries };
