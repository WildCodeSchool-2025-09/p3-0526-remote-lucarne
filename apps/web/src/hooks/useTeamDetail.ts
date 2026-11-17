import { parisDate } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { getTeamRoster } from "../services/team.service";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../services/team.service";
import { teamKeys } from "../features/team/teamKeys";
export function useTeamDetail(id: string) { return useQuery({ queryKey: teamKeys.detail(id), queryFn: () => getTeam(id), enabled: id !== "", retry: false }); }

export function useTeamRoster(id: string) {
  const [date, setDate] = useState(() => parisDate());
  useEffect(() => {
    const update = () => setDate(parisDate());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  return useQuery({ queryKey: teamKeys.roster(id, date), queryFn: () => getTeamRoster(id), enabled: id !== "", retry: false, refetchInterval: 30_000 });
}
