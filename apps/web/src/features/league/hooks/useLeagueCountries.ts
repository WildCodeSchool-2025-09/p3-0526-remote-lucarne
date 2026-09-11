import { useQuery } from "@tanstack/react-query";
import { listLeagueCountries } from "../../../services/league.service";

function useLeagueCountries() {
  return useQuery({
    queryKey: ["league-countries"],
    queryFn: listLeagueCountries,
    staleTime: 5 * 60 * 1000,
  });
}

export { useLeagueCountries };
