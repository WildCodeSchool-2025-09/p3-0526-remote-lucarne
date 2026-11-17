import type { League, UpdateLeagueInput } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../lib/httpClient";
import { updateLeague } from "../services/league.service";
import { leagueKeys } from "../features/league/leagueKeys";
import { invalidatePublicPortal } from "../components/public/publicPortalCache";

function useUpdateLeague(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation<League, HttpError, UpdateLeagueInput>({
    mutationFn: (input) => updateLeague(leagueId, input),
    onSuccess: async (league) => {
      queryClient.setQueryData(leagueKeys.detail(leagueId), league);
      await Promise.all([
        invalidatePublicPortal(queryClient),
        queryClient.invalidateQueries({ queryKey: leagueKeys.detail(leagueId) }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.countries() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicNavigation() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicDetails() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicTeams() }),
      ]);
    },
    retry: false,
  });
}

export { useUpdateLeague };
