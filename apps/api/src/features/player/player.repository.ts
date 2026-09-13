import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type { CreatePlayerInput, ListPlayersParams, UpdatePlayerInput } from "@lucarne/shared";

const playerInclude = { teamPlayers: { where: { leftAt: null }, include: { team: true }, take: 1 }, legacyTeam: true, matchEvents: { select: { id: true }, take: 1 } } satisfies Prisma.PlayerInclude;
const findPlayerById = (id: string) => prisma.player.findUnique({ where: { id }, include: playerInclude });
const listPlayers = async (params: ListPlayersParams) => {
  const searchTerms = params.search?.split(/\s+/).filter(Boolean) ?? [];
  const searchFilter: Prisma.PlayerWhereInput = params.search ? {
    OR: [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      ...(searchTerms.length > 1 ? [{ AND: [{ firstName: { contains: searchTerms[0], mode: "insensitive" as const } }, { lastName: { contains: searchTerms.slice(1).join(" "), mode: "insensitive" as const } }] }] : []),
    ],
  } : {};
  const teamFilter: Prisma.PlayerWhereInput = params.teamName ? { OR: [{ legacyTeam: { name: { contains: params.teamName, mode: "insensitive" } } }, { teamPlayers: { some: { leftAt: null, team: { name: { contains: params.teamName, mode: "insensitive" } } } } }] } : {};
  const where: Prisma.PlayerWhereInput = { AND: [searchFilter, teamFilter, ...(params.status !== undefined && params.status !== "ALL" ? [{ isActive: params.status === "ACTIVE" }] : []), ...(params.position ? [{ position: params.position }] : [])] };
  const skip = ((params.page ?? 1) - 1) * (params.pageSize ?? 20);
  const [data, totalItems] = await Promise.all([prisma.player.findMany({ where, include: playerInclude, orderBy: [{ [params.sortBy ?? "lastName"]: params.sortOrder ?? "asc" }, { id: "asc" }], skip, take: params.pageSize ?? 20 }), prisma.player.count({ where })]);
  return { data, totalItems };
};
const createPlayer = async (input: CreatePlayerInput) => prisma.$transaction(async (tx) => {
  const player = await tx.player.create({ data: { firstName: input.firstName.trim(), lastName: input.lastName.trim(), nationality: input.nationality ?? null, position: input.position ?? null, birthday: input.birthday ? new Date(input.birthday) : null, pictureUrl: input.pictureUrl ?? null } });
  if (input.teamId) await tx.teamPlayer.create({ data: { playerId: player.id, teamId: input.teamId, joinedAt: new Date(input.joinedAt!), shirtNumber: input.shirtNumber ?? null } });
  return tx.player.findUniqueOrThrow({ where: { id: player.id }, include: playerInclude });
});
const updatePlayerOptimistic = async (id: string, changes: UpdatePlayerInput) => {
  const result = await prisma.player.updateManyAndReturn({ where: { id, version: changes.version }, data: { ...(changes.firstName === undefined ? {} : { firstName: changes.firstName.trim() }), ...(changes.lastName === undefined ? {} : { lastName: changes.lastName.trim() }), ...(changes.nationality === undefined ? {} : { nationality: changes.nationality }), ...(changes.position === undefined ? {} : { position: changes.position }), ...(changes.birthday === undefined ? {} : { birthday: changes.birthday ? new Date(changes.birthday) : null }), ...(changes.pictureUrl === undefined ? {} : { pictureUrl: changes.pictureUrl }), ...(changes.isActive === undefined ? {} : { isActive: changes.isActive }), version: { increment: 1 } } });
  return result[0] ?? null;
};
const deactivatePlayer = (id: string) => prisma.$transaction(async (tx) => { await tx.player.update({ where: { id }, data: { isActive: false, version: { increment: 1 } } }); await tx.teamPlayer.updateMany({ where: { playerId: id, leftAt: null }, data: { leftAt: new Date() } }); return tx.player.findUniqueOrThrow({ where: { id }, include: playerInclude }); });
const activatePlayer = (id: string) => prisma.player.update({ where: { id }, data: { isActive: true, version: { increment: 1 } }, include: playerInclude });
const deletePlayer = (id: string) => prisma.player.delete({ where: { id } });
const hasProtectedDependencies = async (id: string) => { const [assignment, event] = await Promise.all([prisma.teamPlayer.count({ where: { playerId: id } }), prisma.matchEvent.count({ where: { playerId: id } })]); return { assignment, event }; };
const findDuplicate = (input: { firstName?: string; lastName?: string }, excludeId?: string) => prisma.player.findFirst({ where: { ...(input.firstName === undefined ? {} : { firstName: { equals: input.firstName.trim(), mode: "insensitive" } }), ...(input.lastName === undefined ? {} : { lastName: { equals: input.lastName.trim(), mode: "insensitive" } }), ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
export { activatePlayer, createPlayer, deactivatePlayer, deletePlayer, findDuplicate, findPlayerById, hasProtectedDependencies, listPlayers, updatePlayerOptimistic };
