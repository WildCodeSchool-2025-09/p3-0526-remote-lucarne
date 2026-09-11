import type { League } from "../../generated/prisma/client";
import { createLeague } from "./league.repository";
import type { CreateLeagueInput } from "./league.schema";

const createLeagueService = (input: CreateLeagueInput): Promise<League> =>
  createLeague({
    ...input,
    isActive: input.isActive ?? false,
  });

export { createLeagueService };
