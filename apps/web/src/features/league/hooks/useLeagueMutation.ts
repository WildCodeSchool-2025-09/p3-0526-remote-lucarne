import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { activateLeague, deleteLeague } from "../../../services/league.service";

interface LeagueMutationInput {
  action: "activate" | "delete" | "deactivate";
  id: string;
}

function useLeagueMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, HttpError, LeagueMutationInput>({
    mutationFn: async ({ action, id }) => {
      if (action === "activate") {
        await activateLeague(id);
        return;
      }

      await deleteLeague(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
    retry: false,
  });
}

export { useLeagueMutation };
