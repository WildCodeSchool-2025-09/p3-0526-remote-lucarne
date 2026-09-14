import prisma from "../../../database/prisma";
import type { Team as PrismaTeam } from "../../generated/prisma/client";
import type { CreateTeamInput, ListTeamsParams, TeamDeletionDependencies, UpdateTeamInput } from "@lucarne/shared";

const listTeams = async (params: ListTeamsParams) => {
  const where = {
    ...(params.search ? { name: { contains: params.search, mode: "insensitive" as const } } : {}),
    ...(params.status && params.status !== "ALL" ? { isActive: params.status === "ACTIVE" } : {}),
  };
  const skip = ((params.page ?? 1) - 1) * (params.pageSize ?? 20);
  const [data, totalItems] = await Promise.all([
    prisma.team.findMany({ where, orderBy: [{ [params.sortBy ?? "name"]: params.sortOrder ?? "asc" }, { id: "asc" }], skip, take: params.pageSize ?? 20 }),
    prisma.team.count({ where }),
  ]);
  return { data, totalItems };
};

const findTeamById = (id: string) => prisma.team.findUnique({ where: { id } });
const updateTeam = (id: string, data: UpdateTeamInput) => prisma.team.update({ where: { id }, data });
const getTeamDeletionDependencies = async (id: string): Promise<TeamDeletionDependencies> => {
  const [participations, playerAssignments, staffAssignments, homeMatches, awayMatches] = await Promise.all([
    prisma.participation.count({ where: { teamId: id } }),
    prisma.teamPlayer.count({ where: { teamId: id } }),
    prisma.teamStaffMember.count({ where: { teamId: id } }),
    prisma.gameMatch.count({ where: { homeTeamId: id } }),
    prisma.gameMatch.count({ where: { awayTeamId: id } }),
  ]);
  return { participations, playerAssignments, staffAssignments, homeMatches, awayMatches };
};

const hasDeletionDependencies = (dependencies: TeamDeletionDependencies) =>
  Object.values(dependencies).some((count) => count > 0);

const permanentlyDeleteTeam = async (id: string): Promise<{ deleted: boolean; dependencies: TeamDeletionDependencies }> =>
  prisma.$transaction(async (transaction) => {
    const [participations, playerAssignments, staffAssignments, homeMatches, awayMatches] = await Promise.all([
      transaction.participation.count({ where: { teamId: id } }),
      transaction.teamPlayer.count({ where: { teamId: id } }),
      transaction.teamStaffMember.count({ where: { teamId: id } }),
      transaction.gameMatch.count({ where: { homeTeamId: id } }),
      transaction.gameMatch.count({ where: { awayTeamId: id } }),
    ]);
    const dependencies = { participations, playerAssignments, staffAssignments, homeMatches, awayMatches };
    if (hasDeletionDependencies(dependencies)) return { deleted: false, dependencies };
    await transaction.team.delete({ where: { id } });
    return { deleted: true, dependencies };
  });

const createTeam = async (input: CreateTeamInput): Promise<PrismaTeam> =>
  prisma.team.create({
    data: {
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      stadium: input.stadium ?? null,
      isActive: true,
    },
  });

export { createTeam, findTeamById, getTeamDeletionDependencies, hasDeletionDependencies, listTeams, permanentlyDeleteTeam, updateTeam };
