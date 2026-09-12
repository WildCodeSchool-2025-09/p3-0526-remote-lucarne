import type { Team as PrismaTeam } from "../../generated/prisma/client";
import type { CreateTeamInput, ListTeamsParams, UpdateTeamInput } from "@lucarne/shared";
import { createTeam, findTeamById, listTeams, updateTeam } from "./team.repository";
import { AppError } from "../../errors/AppError";
import { APP_ROLES } from "../../auth/appRole";

const createTeamService = (input: CreateTeamInput): Promise<PrismaTeam> =>
  createTeam({
    name: input.name,
    logoUrl: input.logoUrl ?? null,
    stadium: input.stadium ?? null,
  });

const listTeamsService = (params: ListTeamsParams) => listTeams(params);
const getTeamService = async (id: string) => {
  const team = await findTeamById(id);
  if (!team) throw new AppError(404, "RESOURCE_NOT_FOUND", "Team not found");
  return team;
};
const updateTeamService = async (id: string, changes: UpdateTeamInput, role: string) => {
  if (changes.isActive !== undefined && role !== APP_ROLES.ADMIN) throw new AppError(403, "INSUFFICIENT_ROLE", "Only administrators can change team status");
  await getTeamService(id);
  return updateTeam(id, changes);
};

export { createTeamService, getTeamService, listTeamsService, updateTeamService };
