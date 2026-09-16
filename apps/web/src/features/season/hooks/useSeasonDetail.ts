import { useQuery } from "@tanstack/react-query";
import { getSeason } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";

function useSeasonDetail(seasonId: string) {
  return useQuery({
    queryKey: seasonKeys.detail(seasonId),
    enabled: seasonId !== "",
    queryFn: () => getSeason(seasonId),
    retry: false,
  });
}

export { useSeasonDetail };
