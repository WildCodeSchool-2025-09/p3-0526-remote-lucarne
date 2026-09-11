import type { CreateTeamInput, Team } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { logoUrl, name, stadium } = input;

  return httpClient.post<Team>("/teams", {
    json: {
      logoUrl: logoUrl ?? null,
      name,
      stadium: stadium ?? null,
    },
  });
}

export { createTeam };
