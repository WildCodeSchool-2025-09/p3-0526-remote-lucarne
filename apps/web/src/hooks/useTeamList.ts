import type { ListTeamsParams } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import { listTeams } from "../services/team.service";
export function useTeamList(params: ListTeamsParams) { return useQuery({ queryKey: ["teams", params], queryFn: () => listTeams(params), retry: false }); }
