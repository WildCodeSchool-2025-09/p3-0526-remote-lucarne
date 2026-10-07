import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { deleteSeason } from "../../../services/season.service";
import { leagueKeys } from "../../league/leagueKeys";
import { seasonKeys } from "../seasonKeys";

function useDeleteSeason() {
  const queryClient = useQueryClient();

  return useMutation<void, HttpError, string>({
    mutationFn: deleteSeason,
    onSuccess: async (_result, seasonId) => {
      queryClient.removeQueries({ queryKey: seasonKeys.detail(seasonId) });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.all }),
      ]);
    },
    retry: false,
  });
}

export { useDeleteSeason };
