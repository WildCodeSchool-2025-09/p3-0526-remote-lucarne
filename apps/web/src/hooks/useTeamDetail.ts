import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../services/team.service";
export function useTeamDetail(id: string) { return useQuery({ queryKey: ["team", id], queryFn: () => getTeam(id), retry: false }); }
