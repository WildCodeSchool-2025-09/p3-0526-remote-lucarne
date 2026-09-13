import type { ListTeamsParams } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import { listTeams } from "../services/team.service";
import { teamKeys } from "../features/team/teamKeys";
export function useTeamList(params: ListTeamsParams) { return useQuery({ queryKey: teamKeys.list(params), queryFn: () => listTeams(params), retry: false }); }
