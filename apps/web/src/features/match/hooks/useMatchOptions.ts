import { useQuery } from "@tanstack/react-query";
import { listLeagues } from "../../../services/league.service";
import { listSeasons } from "../../../services/season.service";
import { listTeams } from "../../../services/team.service";
import { leagueKeys } from "../../league/leagueKeys";
import { seasonKeys } from "../../season/seasonKeys";
import { teamKeys } from "../../team/teamKeys";

async function loadAllPages<T>(
  load: (page: number) => Promise<{ data: T[]; pagination: { totalPages: number } }>,
): Promise<T[]> {
  const first = await load(1);
  const data = [...first.data];

  for (let page = 2; page <= first.pagination.totalPages; page++)
    data.push(...(await load(page)).data);

  return data;
}

function useMatchOptions() {
  const leagues = useQuery({
    queryKey: [...leagueKeys.all, "match-options"],
    queryFn: () =>
      loadAllPages((page) =>
        listLeagues({ page, pageSize: 20, sortBy: "name", sortOrder: "asc" }),
      ),
  });
  const seasons = useQuery({
    queryKey: [...seasonKeys.all, "match-options"],
    queryFn: () =>
      loadAllPages((page) =>
        listSeasons({ page, pageSize: 20, sortBy: "startDate", sortOrder: "desc" }),
      ),
  });
  const teams = useQuery({
    queryKey: [...teamKeys.all, "match-options"],
    queryFn: () =>
      loadAllPages((page) =>
        listTeams({ page, pageSize: 20, sortBy: "name", sortOrder: "asc" }),
      ),
  });

  return {
    leagues: leagues.data ?? [],
    seasons: seasons.data ?? [],
    teams: teams.data ?? [],
    isPending: leagues.isPending || seasons.isPending || teams.isPending,
    isError: leagues.isError || seasons.isError || teams.isError,
    reload: () => Promise.all([leagues.refetch(), seasons.refetch(), teams.refetch()]),
  };
}

export { useMatchOptions };
