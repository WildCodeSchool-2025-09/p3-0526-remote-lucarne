import prisma from "../../../database/prisma";
import type { Team as PrismaTeam } from "../../generated/prisma/client";
import type { CreateTeamInput } from "@lucarne/shared";

const createTeam = async (input: CreateTeamInput): Promise<PrismaTeam> =>
  prisma.team.create({
    data: {
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      stadium: input.stadium ?? null,
      isActive: true,
    },
  });

export { createTeam };
