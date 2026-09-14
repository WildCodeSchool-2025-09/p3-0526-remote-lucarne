import type { Team as PrismaTeam } from "../../generated/prisma/client";
import { Prisma } from "../../generated/prisma/client";
import type { CreateTeamInput, ListTeamsParams, TeamDeletionDependencies, TeamDeletionPreview, UpdateTeamInput } from "@lucarne/shared";
import { createTeam, findTeamById, getTeamDeletionDependencies, hasDeletionDependencies, listTeams, permanentlyDeleteTeam, updateTeam } from "./team.repository";
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
  void role;
  await getTeamService(id);
  return updateTeam(id, changes);
};
const getTeamDeletionPreviewService = async (id: string): Promise<TeamDeletionPreview> => {
  await getTeamService(id);
  const dependencies = await getTeamDeletionDependencies(id);
  return { dependencies, canDelete: !hasDeletionDependencies(dependencies) };
};
const deletionBlockedError = (dependencies: TeamDeletionDependencies) => new AppError(
  409,
  "TEAM_DELETION_BLOCKED",
  "Team cannot be permanently deleted while it has protected dependencies",
  Object.entries(dependencies)
    .filter(([, count]) => count > 0)
    .map(([field, count]) => ({ field, message: `${count} protected record(s) block permanent deletion` })),
);
const deleteTeamService = async (id: string, role: string) => {
  if (role !== APP_ROLES.ADMIN) throw new AppError(403, "INSUFFICIENT_ROLE", "Only administrators can delete teams");
  await getTeamService(id);
  try {
    const result = await permanentlyDeleteTeam(id);
    if (!result.deleted) throw deletionBlockedError(result.dependencies);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw deletionBlockedError(await getTeamDeletionDependencies(id));
    }
    throw error;
  }
};

export { createTeamService, deleteTeamService, getTeamDeletionPreviewService, getTeamService, listTeamsService, updateTeamService };
