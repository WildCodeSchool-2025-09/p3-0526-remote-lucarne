import { leagueSlugSchema } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import { getPublicLeague } from "../../../services/publicLeague.service";
import { leagueKeys } from "../leagueKeys";

function usePublicLeague(leagueSlug: string) {
  return useQuery({
    queryKey: leagueKeys.publicDetail(leagueSlug),
    queryFn: () => getPublicLeague(leagueSlug),
    enabled: leagueSlugSchema.safeParse(leagueSlug).success,
    retry: false,
  });
}

export { usePublicLeague };
