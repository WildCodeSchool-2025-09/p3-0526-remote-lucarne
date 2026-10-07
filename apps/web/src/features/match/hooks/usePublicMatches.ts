import { useQuery } from "@tanstack/react-query";
import type { MatchListQuery } from "@lucarne/shared";
import { getPublicMatch, listPublicMatches } from "../../../services/match.service";
import { matchKeys } from "../matchKeys";

const usePublicMatchList = (params: MatchListQuery, enabled = true) =>
  useQuery({
    queryKey: matchKeys.publicList(params),
    queryFn: () => listPublicMatches(params),
    enabled,
  });
const usePublicMatch = (matchPublicId: string) =>
  useQuery({
    queryKey: matchKeys.publicDetail(matchPublicId),
    queryFn: () => getPublicMatch(matchPublicId),
    enabled: Boolean(matchPublicId),
    retry: false,
  });

export { usePublicMatch, usePublicMatchList };
