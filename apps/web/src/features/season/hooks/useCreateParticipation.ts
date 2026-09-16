import type { CreateParticipationInput, Participation } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { createParticipation } from "../../../services/participation.service";
import { seasonKeys } from "../seasonKeys";

function useCreateParticipation(seasonId: string) {
  const queryClient = useQueryClient();

  return useMutation<Participation, HttpError, CreateParticipationInput>({
    mutationFn: (input) => createParticipation(seasonId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: seasonKeys.detail(seasonId) });
    },
    retry: false,
  });
}

export { useCreateParticipation };
