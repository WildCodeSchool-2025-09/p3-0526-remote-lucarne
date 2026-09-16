import type { WithdrawParticipationResponse } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { withdrawParticipation } from "../../../services/participation.service";
import { seasonKeys } from "../seasonKeys";

interface WithdrawParticipationInput {
  seasonId: string;
  teamId: string;
}

function useWithdrawParticipation() {
  const queryClient = useQueryClient();

  return useMutation<WithdrawParticipationResponse, HttpError, WithdrawParticipationInput>({
    mutationFn: ({ seasonId, teamId }) => withdrawParticipation(seasonId, teamId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: seasonKeys.detail(result.participation.seasonId) });
    },
    retry: false,
  });
}

export { useWithdrawParticipation };
export type { WithdrawParticipationInput };
