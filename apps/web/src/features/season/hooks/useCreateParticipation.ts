import type { CreateParticipationInput, Participation } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { createParticipation } from "../../../services/participation.service";
import { seasonKeys } from "../seasonKeys";

function useCreateParticipation(leagueSeasonId: string) {
  const queryClient = useQueryClient();

  return useMutation<Participation, HttpError, CreateParticipationInput>({
    mutationFn: (input) => createParticipation(leagueSeasonId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: seasonKeys.all });
    },
    retry: false,
  });
}

export { useCreateParticipation };
