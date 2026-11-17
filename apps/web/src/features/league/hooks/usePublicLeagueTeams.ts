import { useQuery } from "@tanstack/react-query";
import type { PublicLeagueTeamsQuery } from "@lucarne/shared";
import { listPublicLeagueTeams } from "../../../services/publicLeague.service";
import { leagueKeys } from "../leagueKeys";

function usePublicLeagueTeams(leagueSlug: string, seasonId: string, query: PublicLeagueTeamsQuery, enabled: boolean) {
  return useQuery({
    queryKey: leagueKeys.publicTeamList(leagueSlug, seasonId, query),
    queryFn: () => listPublicLeagueTeams(leagueSlug, seasonId, query),
    enabled: enabled && Boolean(seasonId),
    retry: false,
  });
}

export { usePublicLeagueTeams };
