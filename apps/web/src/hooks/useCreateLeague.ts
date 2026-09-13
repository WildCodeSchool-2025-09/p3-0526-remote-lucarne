import type { CreateLeagueInput, League } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../lib/httpClient";
import { createLeague } from "../services/league.service";
import { leagueKeys } from "../features/league/leagueKeys";

function useCreateLeague() {
  const queryClient = useQueryClient();
  return useMutation<League, HttpError, CreateLeagueInput>({
    mutationFn: (input) => createLeague(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.countries() }),
      ]);
    },
    retry: false,
  });
}

export { useCreateLeague };
