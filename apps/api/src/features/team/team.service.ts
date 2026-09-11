import type { Team as PrismaTeam } from "../../generated/prisma/client";
import type { CreateTeamInput } from "@lucarne/shared";
import { createTeam } from "./team.repository";

const createTeamService = (input: CreateTeamInput): Promise<PrismaTeam> =>
  createTeam({
    name: input.name,
    logoUrl: input.logoUrl ?? null,
    stadium: input.stadium ?? null,
  });

export { createTeamService };
