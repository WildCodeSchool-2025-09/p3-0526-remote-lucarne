import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { deleteTeam, updateTeam } from "../../../services/team.service";

interface TeamMutationInput { action: "delete" | "deactivate" | "activate"; id: string; }

function useTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, HttpError, TeamMutationInput>({
    mutationFn: async ({ action, id }) => {
      if (action === "delete") { await deleteTeam(id); return; }
      await updateTeam(id, { isActive: action === "activate" });
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["teams"] }); },
    retry: false,
  });
}

export { useTeamMutation };
