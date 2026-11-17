import type { Team, UpdateTeamInput } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeam } from "../services/team.service";
import { teamKeys } from "../features/team/teamKeys";
import { leagueKeys } from "../features/league/leagueKeys";
import { invalidatePublicPortal } from "../components/public/publicPortalCache";

export function useUpdateTeam(id: string) {
  const client = useQueryClient();
  return useMutation<Team, Error, UpdateTeamInput>({
    mutationFn: (input) => updateTeam(id, input),
    onSuccess: async (team) => {
      client.setQueryData(teamKeys.detail(id), team);
      await Promise.all([
        client.invalidateQueries({ queryKey: teamKeys.lists() }),
        client.invalidateQueries({ queryKey: leagueKeys.publicTeams() }),
        invalidatePublicPortal(client),
      ]);
    },
    retry: false,
  });
}
