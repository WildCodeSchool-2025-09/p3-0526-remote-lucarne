import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { activateLeague, deactivateLeague, deleteLeague } from "../../../services/league.service";
import { leagueKeys } from "../leagueKeys";

interface LeagueMutationInput {
  action: "activate" | "delete" | "deactivate";
  id: string;
}

function useLeagueMutation() {
  const queryClient = useQueryClient();

  return useMutation<Awaited<ReturnType<typeof activateLeague>> | void, HttpError, LeagueMutationInput>({
    mutationFn: async ({ action, id }) => {
      if (action === "activate") {
        return activateLeague(id);
      }

      if (action === "deactivate") {
        return deactivateLeague(id);
      }

      return deleteLeague(id);
    },
    onSuccess: async (league, variables) => {
      if (variables.action === "delete") {
        queryClient.removeQueries({ queryKey: leagueKeys.detail(variables.id) });
      } else if (league !== undefined) {
        queryClient.setQueryData(leagueKeys.detail(variables.id), league);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: leagueKeys.countries() }),
      ]);
    },
    retry: false,
  });
}

export { useLeagueMutation };
