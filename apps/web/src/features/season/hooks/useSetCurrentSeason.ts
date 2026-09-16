import type { Season } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { setCurrentSeason } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";

interface SetCurrentSeasonInput {
  leagueId: string;
  seasonId: string;
}

function useSetCurrentSeason() {
  const queryClient = useQueryClient();

  return useMutation<Season, HttpError, SetCurrentSeasonInput>({
    mutationFn: ({ leagueId, seasonId }) => setCurrentSeason(leagueId, seasonId),
    onSuccess: async (season) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: seasonKeys.detail(season.id) }),
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() }),
      ]);
    },
    retry: false,
  });
}

export { useSetCurrentSeason };
export type { SetCurrentSeasonInput };
