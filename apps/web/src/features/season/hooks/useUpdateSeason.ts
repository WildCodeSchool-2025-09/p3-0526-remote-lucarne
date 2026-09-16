import type { Season, UpdateSeasonInput } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { updateSeason } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";

function useUpdateSeason(seasonId: string) {
  const queryClient = useQueryClient();

  return useMutation<Season, HttpError, UpdateSeasonInput>({
    mutationFn: (input) => updateSeason(seasonId, input),
    onSuccess: async (season) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: seasonKeys.detail(season.id) }),
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() }),
      ]);
    },
    retry: false,
  });
}

export { useUpdateSeason };
