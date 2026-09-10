import type { CreateLeagueInput, League } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function createLeague(input: CreateLeagueInput): Promise<League> {
  return httpClient.post<League>("/leagues", { json: input });
}

export { createLeague };
