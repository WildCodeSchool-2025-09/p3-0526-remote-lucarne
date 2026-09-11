import type { League, UpdateLeagueInput } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../lib/httpClient";
import { updateLeague } from "../services/league.service";

function useUpdateLeague(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation<League, HttpError, UpdateLeagueInput>({
    mutationFn: (input) => updateLeague(leagueId, input),
    onSuccess: async (league) => {
      queryClient.setQueryData(["league", leagueId], league);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["league", leagueId] }),
        queryClient.invalidateQueries({ queryKey: ["leagues"] }),
        queryClient.invalidateQueries({ queryKey: ["league-countries"] }),
      ]);
    },
    retry: false,
  });
}

export { useUpdateLeague };
