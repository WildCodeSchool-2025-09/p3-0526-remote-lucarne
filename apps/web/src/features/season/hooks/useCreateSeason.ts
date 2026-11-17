import type { CreateSeasonInput, Season } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { createSeason } from "../../../services/season.service";
import { seasonKeys } from "../seasonKeys";

function useCreateSeason() {
  const queryClient = useQueryClient();

  return useMutation<Season, HttpError, CreateSeasonInput>({
    mutationFn: (input) => createSeason(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: seasonKeys.lists() });
    },
    retry: false,
  });
}

export { useCreateSeason };
