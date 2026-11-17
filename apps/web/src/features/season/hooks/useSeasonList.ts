import type { ListSeasonsParams } from "@lucarne/shared";
import { useQuery } from "@tanstack/react-query";
import { listSeasons } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";

function useSeasonList(params: ListSeasonsParams) {
  return useQuery({
    queryKey: seasonKeys.list(params),
    queryFn: () => listSeasons(params),
    retry: false,
  });
}

export { useSeasonList };
