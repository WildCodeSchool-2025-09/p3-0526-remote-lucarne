import type { Season, UpdateSeasonInput } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { updateSeason } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";
import { leagueKeys } from "../../league/leagueKeys";
import { invalidatePublicPortal } from "../../../components/public/publicPortalCache";

function useUpdateSeason(seasonId: string) {
  const queryClient = useQueryClient();

  return useMutation<Season, HttpError, UpdateSeasonInput>({
    mutationFn: (input) => updateSeason(seasonId, input),
    onSuccess: async (season) => {
      await Promise.all([
        invalidatePublicPortal(queryClient),
        queryClient.invalidateQueries({ queryKey: seasonKeys.detail(season.id) }),
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: seasonKeys.leagueLists() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicDetails() }),
      ]);
    },
    retry: false,
  });
}

export { useUpdateSeason };
