import type { ParticipationWithdrawalPreview } from "@lucarne/shared";
import { useMutation } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { getParticipationWithdrawalPreview } from "../../../services/participation.service";

interface ParticipationWithdrawalPreviewInput {
  seasonId: string;
  teamId: string;
}

function useParticipationWithdrawalPreview() {
  return useMutation<ParticipationWithdrawalPreview, HttpError, ParticipationWithdrawalPreviewInput>({
    mutationFn: ({ seasonId, teamId }) => getParticipationWithdrawalPreview(seasonId, teamId),
    retry: false,
  });
}

export { useParticipationWithdrawalPreview };
export type { ParticipationWithdrawalPreviewInput };
