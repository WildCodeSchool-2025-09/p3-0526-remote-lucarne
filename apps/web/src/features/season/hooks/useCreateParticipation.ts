import type { CreateParticipationInput, Participation } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { createParticipation } from "../../../services/participation.service";
import { seasonKeys } from "../seasonKeys";
import { leagueKeys } from "../../league/leagueKeys";
import { invalidatePublicPortal } from "../../../components/public/publicPortalCache";

function useCreateParticipation(leagueSeasonId: string) {
  const queryClient = useQueryClient();

  return useMutation<Participation, HttpError, CreateParticipationInput>({
    mutationFn: (input) => createParticipation(leagueSeasonId, input),
    onSuccess: async () => {
      await Promise.all([
        invalidatePublicPortal(queryClient),
        queryClient.invalidateQueries({ queryKey: seasonKeys.all }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.publicTeams() }),
      ]);
    },
    retry: false,
  });
}

export { useCreateParticipation };
