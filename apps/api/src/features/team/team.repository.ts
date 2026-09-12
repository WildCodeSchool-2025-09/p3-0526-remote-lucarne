import prisma from "../../../database/prisma";
import type { Team as PrismaTeam } from "../../generated/prisma/client";
import type { CreateTeamInput, ListTeamsParams, UpdateTeamInput } from "@lucarne/shared";

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

const createTeam = async (input: CreateTeamInput): Promise<PrismaTeam> =>
  prisma.team.create({
    data: {
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      stadium: input.stadium ?? null,
      isActive: true,
    },
  });

export { createTeam, findTeamById, listTeams, updateTeam };
