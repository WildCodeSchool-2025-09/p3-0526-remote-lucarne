import type { CreateTeamInput, Team } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../lib/httpClient";
import { createTeam } from "../services/team.service";

function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation<Team, HttpError, CreateTeamInput>({
    mutationFn: (input) => createTeam(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    retry: false,
  });
}

export { useCreateTeam };
