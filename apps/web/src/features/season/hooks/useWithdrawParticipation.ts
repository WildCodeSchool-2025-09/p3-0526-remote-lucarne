import type { WithdrawParticipationResponse } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { withdrawParticipation } from "../../../services/participation.service";
import { seasonKeys } from "../seasonKeys";
import { leagueKeys } from "../../league/leagueKeys";
import { invalidatePublicPortal } from "../../../components/public/publicPortalCache";

interface WithdrawParticipationInput {
  leagueSeasonId: string;
  teamId: string;
}

function useWithdrawParticipation() {
  const queryClient = useQueryClient();

  return useMutation<
    WithdrawParticipationResponse,
    HttpError,
    WithdrawParticipationInput
  >({
    mutationFn: ({ leagueSeasonId, teamId }) =>
      withdrawParticipation(leagueSeasonId, teamId),
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

export { useWithdrawParticipation };

export type { WithdrawParticipationInput };
