import type { ParticipationWithdrawalPreview } from "@lucarne/shared";
import { useMutation } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { getParticipationWithdrawalPreview } from "../../../services/participation.service";

interface ParticipationWithdrawalPreviewInput {
  leagueSeasonId: string;
  teamId: string;
}

function useParticipationWithdrawalPreview() {
  return useMutation<
    ParticipationWithdrawalPreview,
    HttpError,
    ParticipationWithdrawalPreviewInput
  >({
    mutationFn: ({ leagueSeasonId, teamId }) =>
      getParticipationWithdrawalPreview(leagueSeasonId, teamId),
    retry: false,
  });
}

export { useParticipationWithdrawalPreview };

export type { ParticipationWithdrawalPreviewInput };
