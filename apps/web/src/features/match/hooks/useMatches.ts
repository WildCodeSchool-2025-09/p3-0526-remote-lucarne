import type { AdminMatch, MatchListQuery } from "@lucarne/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { getMatch, listMatches } from "../../../services/match.service";
import { seasonKeys } from "../../season/seasonKeys";
import { leagueKeys } from "../../league/leagueKeys";
import { teamKeys } from "../../team/teamKeys";
import { matchKeys } from "../matchKeys";
import { invalidatePublicPortal } from "../../../components/public/publicPortalCache";

const useMatchList = (params: MatchListQuery, enabled = true) =>
  useQuery({
    queryKey: matchKeys.list(params),
    queryFn: () => listMatches(params),
    enabled,
  });
const useMatch = (id: string) =>
  useQuery({
    queryKey: matchKeys.detail(id),
    queryFn: () => getMatch(id),
    enabled: Boolean(id),
    retry: false,
  });

function useMatchMutation<T, R = AdminMatch>(mutationFn: (input: T) => Promise<R>) {
  const client = useQueryClient();

  return useMutation<R, HttpError, T>({
    mutationFn,
    retry: false,
    onSuccess: async () => {
      await invalidatePublicPortal(client);
      await Promise.all(
        [matchKeys.all, seasonKeys.all, leagueKeys.all, teamKeys.all].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export { useMatch, useMatchList, useMatchMutation };
