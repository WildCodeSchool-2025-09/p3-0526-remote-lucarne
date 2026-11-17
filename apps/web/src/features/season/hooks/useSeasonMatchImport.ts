import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MatchImportApply, MatchImportDocument } from "@lucarne/shared";
import { applySeasonMatchImport, previewSeasonMatchImport } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";
import { matchKeys } from "../../match/matchKeys";
import { leagueKeys } from "../../league/leagueKeys";
import { teamKeys } from "../../team/teamKeys";
import { invalidatePublicPortal } from "../../../components/public/publicPortalCache";

function useSeasonMatchImport(leagueId: string, seasonId: string) {
  const queryClient = useQueryClient();
  const preview = useMutation({ mutationFn: (document: MatchImportDocument) => previewSeasonMatchImport(leagueId, seasonId, document) });
  const apply = useMutation({
    mutationFn: (input: MatchImportApply) => applySeasonMatchImport(leagueId, seasonId, input),
    onSuccess: async () => {
      await invalidatePublicPortal(queryClient);
      await Promise.all([seasonKeys.all, matchKeys.all, leagueKeys.all, teamKeys.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
  return { preview, apply };
}
export { useSeasonMatchImport };
