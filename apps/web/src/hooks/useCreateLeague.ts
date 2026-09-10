import type { CreateLeagueInput, League } from "@lucarne/shared";
import { useMutation } from "@tanstack/react-query";
import type { HttpError } from "../lib/httpClient";
import { createLeague } from "../services/league.service";

function useCreateLeague() {
  return useMutation<League, HttpError, CreateLeagueInput>({
    mutationFn: (input) => createLeague(input),
    retry: false,
  });
}

export { useCreateLeague };
