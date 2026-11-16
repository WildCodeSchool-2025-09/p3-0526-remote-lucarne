import { useQuery } from "@tanstack/react-query";
import type { PublicTeamQuery } from "@lucarne/shared";
import { getPublicTeam, getPublicTeamRoster, listPublicTeams } from "../../../services/publicTeam.service";
import { teamKeys } from "../teamKeys";

export const usePublicTeams = (query: PublicTeamQuery, enabled = true) => useQuery({ queryKey: [...teamKeys.lists(), "public", query], queryFn: () => listPublicTeams(query), enabled });
export const usePublicTeam = (id: string, enabled = true) => useQuery({ queryKey: [...teamKeys.detail(id), "public"], queryFn: () => getPublicTeam(id), enabled });
export const usePublicTeamRoster = (id: string) => useQuery({ queryKey: [...teamKeys.rosters(), id, "public", "current"], queryFn: () => getPublicTeamRoster(id) });
