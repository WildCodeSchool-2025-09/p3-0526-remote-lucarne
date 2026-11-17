import type { CreateTeamInput, Team } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../lib/httpClient";
import { createTeam } from "../services/team.service";
import { teamKeys } from "../features/team/teamKeys";
import { invalidatePublicPortal } from "../components/public/publicPortalCache";

function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation<Team, HttpError, CreateTeamInput>({
    mutationFn: (input) => createTeam(input),
    onSuccess: async () => {
      await invalidatePublicPortal(queryClient);
      await queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
    },
    retry: false,
  });
}

export { useCreateTeam };
