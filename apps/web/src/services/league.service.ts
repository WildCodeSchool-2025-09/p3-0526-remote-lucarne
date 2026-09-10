import type { CreateLeagueInput, League } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function createLeague(input: CreateLeagueInput): Promise<League> {
  const { country, isActive, logoUrl, name } = input;

  return httpClient.post<League>("/leagues", {
    json: { country, isActive, logoUrl, name },
  });
}

export { createLeague };
