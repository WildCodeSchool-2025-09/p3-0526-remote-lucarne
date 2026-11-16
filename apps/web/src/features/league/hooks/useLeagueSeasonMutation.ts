import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssignLeagueSeasonInput } from "@lucarne/shared";
import type { HttpError } from "../../../lib/httpClient";
import {
  assignLeagueSeason,
  removeLeagueSeason,
  setCurrentSeason,
} from "../../../services/season.service";
import { seasonKeys } from "../../season/seasonKeys";
import { leagueKeys } from "../leagueKeys";
import { matchKeys } from "../../match/matchKeys";
import { invalidatePublicPortal } from "../../../components/public/publicPortalCache";

type LeagueSeasonMutationInput =
  | ({ action: "assign"; leagueId: string } & AssignLeagueSeasonInput)
  | { action: "remove" | "current"; leagueId: string; seasonId: string };

function useLeagueSeasonMutation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, HttpError, LeagueSeasonMutationInput>({
    mutationFn: (input) => {
      const { action, leagueId, seasonId } = input;

      if (action === "assign")
        return assignLeagueSeason(leagueId, {
          seasonId,
          matchdayCount: input.matchdayCount,
          matchesPerMatchday: input.matchesPerMatchday,
        });

      if (action === "remove") return removeLeagueSeason(leagueId, seasonId);

      return setCurrentSeason(leagueId, seasonId);
    },
    onSuccess: async (_result, { leagueId }) => {
      await Promise.all([
        invalidatePublicPortal(queryClient),
        queryClient.invalidateQueries({ queryKey: matchKeys.all }),
        queryClient.invalidateQueries({ queryKey: seasonKeys.all }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.detail(leagueId) }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicDetails() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicTeams() }),
      ]);
    },
    retry: false,
  });
}

export { useLeagueSeasonMutation };
