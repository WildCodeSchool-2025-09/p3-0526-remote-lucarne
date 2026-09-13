import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../services/team.service";
import { teamKeys } from "../features/team/teamKeys";
export function useTeamDetail(id: string) { return useQuery({ queryKey: teamKeys.detail(id), queryFn: () => getTeam(id), enabled: id !== "", retry: false }); }
