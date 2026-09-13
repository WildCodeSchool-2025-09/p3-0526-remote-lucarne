import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { deleteTeam, updateTeam } from "../../../services/team.service";
import { teamKeys } from "../teamKeys";

interface TeamMutationInput { action: "delete" | "deactivate" | "activate"; id: string; }

function useTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation<Awaited<ReturnType<typeof updateTeam>> | void, HttpError, TeamMutationInput>({
    mutationFn: async ({ action, id }) => {
      if (action === "delete") return deleteTeam(id);
      return updateTeam(id, { isActive: action === "activate" });
    },
    onSuccess: async (team, variables) => {
      if (variables.action === "delete") queryClient.removeQueries({ queryKey: teamKeys.detail(variables.id) });
      else if (team !== undefined) queryClient.setQueryData(teamKeys.detail(variables.id), team);
      await queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
    },
    retry: false,
  });
}

export { useTeamMutation };
