import type { Team, UpdateTeamInput } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeam } from "../services/team.service";
export function useUpdateTeam(id: string) { const client = useQueryClient(); return useMutation<Team, Error, UpdateTeamInput>({ mutationFn: (input) => updateTeam(id, input), onSuccess: async (team) => { client.setQueryData(["team", id], team); await client.invalidateQueries({ queryKey: ["teams"] }); }, retry: false }); }
