import type { CreateLeagueInput, League } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../lib/httpClient";
import { createLeague } from "../services/league.service";
import { leagueKeys } from "../features/league/leagueKeys";
import { invalidatePublicPortal } from "../components/public/publicPortalCache";

function useCreateLeague() {
  const queryClient = useQueryClient();
  return useMutation<League, HttpError, CreateLeagueInput>({
    mutationFn: (input) => createLeague(input),
    onSuccess: async () => {
      await Promise.all([
        invalidatePublicPortal(queryClient),
        queryClient.invalidateQueries({ queryKey: leagueKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.countries() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicNavigation() }),
      ]);
    },
    retry: false,
  });
}

export { useCreateLeague };
