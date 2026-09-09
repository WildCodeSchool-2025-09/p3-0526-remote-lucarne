import prisma from "../../../database/prisma";
import type { League } from "../../generated/prisma/client";
import type { CreateLeagueInput } from "./league.schema";

const createLeague = (input: CreateLeagueInput): Promise<League> =>
  prisma.league.create({
    data: input,
  });

export { createLeague };
