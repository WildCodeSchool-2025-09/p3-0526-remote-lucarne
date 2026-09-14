import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type { CreatePlayerAssignmentInput, CreatePlayerInput, ListPlayersParams, UpdatePlayerInput } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { currentAssignmentWhere, plannedAssignmentWhere, utcDate } from "./player.assignment";

const assignmentSelect = {
  id: true, joinedAt: true, leftAt: true, shirtNumber: true,
  team: { select: { id: true, name: true } },
} satisfies Prisma.TeamPlayerSelect;

// Only the open assignment is needed for list summaries; history is read on detail.
const playerListInclude = {
  teamPlayers: { where: currentAssignmentWhere(), select: assignmentSelect },
} satisfies Prisma.PlayerInclude;
const playerDetailInclude = {
  teamPlayers: { select: assignmentSelect, orderBy: [{ joinedAt: "desc" }, { id: "asc" }] },
} satisfies Prisma.PlayerInclude;

type PlayerRecord = Prisma.PlayerGetPayload<{ include: typeof playerDetailInclude }>;
const findPlayerById = (id: string) => prisma.player.findUnique({ where: { id }, include: playerDetailInclude });

const listPlayers = async (params: ListPlayersParams) => {
  const date = utcDate();
  const searchTerms = params.search?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.PlayerWhereInput = {
    AND: [
      ...(params.search ? [{ OR: [
        { firstName: { contains: params.search, mode: "insensitive" as const } },
        { lastName: { contains: params.search, mode: "insensitive" as const } },
        ...(searchTerms.length > 1 ? [{ AND: [
          { firstName: { contains: searchTerms[0], mode: "insensitive" as const } },
          { lastName: { contains: searchTerms.slice(1).join(" "), mode: "insensitive" as const } },
        ] }] : []),
      ] }] : []),
      ...(params.status && params.status !== "ALL" ? [{ isActive: params.status === "ACTIVE" }] : []),
      ...(params.position ? [{ position: params.position }] : []),
      ...(params.teamName ? [{
        ...(params.assignmentStatus === "PLANNED" ? {} : { isActive: true }),
        teamPlayers: { some: {
          ...(params.assignmentStatus === "PLANNED" ? plannedAssignmentWhere(date) : currentAssignmentWhere(date)),
          team: { name: { contains: params.teamName, mode: "insensitive" as const } },
        } },
      }] : []),
      ...(params.selectable === true ? [{ isActive: true, teamPlayers: { some: currentAssignmentWhere(date) } }] : []),
    ],
  };
  const [data, totalItems] = await Promise.all([
    prisma.player.findMany({
      where, include: playerListInclude,
      orderBy: [{ [params.sortBy ?? "lastName"]: params.sortOrder ?? "asc" }, { id: "asc" }],
      skip: ((params.page ?? 1) - 1) * (params.pageSize ?? 20), take: params.pageSize ?? 20,
    }),
    prisma.player.count({ where }),
  ]);
  return { data, totalItems };
};

const createPlayer = (input: CreatePlayerInput) => prisma.$transaction(async (tx) => {
  if (input.teamId) {
    // Lock the team so a concurrent status change cannot invalidate this check.
    const teams = await tx.$queryRaw<{ is_active: boolean }[]>`
      SELECT is_active FROM team WHERE id = ${input.teamId}::uuid FOR UPDATE
    `;
    if (!teams[0]) throw new AppError(404, "TEAM_NOT_FOUND", "Équipe introuvable");
    if (!teams[0].is_active) throw new AppError(409, "TEAM_INACTIVE", "L’équipe est inactive");
  }
  const player = await tx.player.create({ data: {
    firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    nationality: input.nationality ?? null, position: input.position ?? null,
    birthday: input.birthday ? new Date(input.birthday) : null, pictureUrl: input.pictureUrl ?? null,
  } });
  if (input.teamId) await tx.teamPlayer.create({ data: {
    playerId: player.id, teamId: input.teamId, joinedAt: new Date(input.joinedAt!), shirtNumber: input.shirtNumber ?? null,
  } });
  return tx.player.findUniqueOrThrow({ where: { id: player.id }, include: playerDetailInclude });
});

const createPlayerAssignment = (playerId: string, input: CreatePlayerAssignmentInput) => prisma.$transaction(async (tx) => {
  const date = utcDate();
  const joinedAt = new Date(input.joinedAt);
  if (joinedAt < date) throw new AppError(400, "ASSIGNMENT_START_IN_PAST", "La date de début ne peut pas être antérieure à aujourd’hui");

  const players = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM player WHERE id = ${playerId}::uuid FOR UPDATE
  `;
  if (!players[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueur introuvable");

  const teams = await tx.$queryRaw<{ is_active: boolean }[]>`
    SELECT is_active FROM team WHERE id = ${input.teamId}::uuid FOR UPDATE
  `;
  if (!teams[0]) throw new AppError(404, "TEAM_NOT_FOUND", "Équipe introuvable");
  if (!teams[0].is_active) throw new AppError(409, "TEAM_INACTIVE", "L’équipe est inactive");

  const planned = await tx.teamPlayer.findFirst({
    where: { playerId, ...plannedAssignmentWhere(date) }, select: { id: true },
  });
  if (planned) throw new AppError(409, "ASSIGNMENT_ALREADY_PLANNED", "Le joueur possède déjà une affectation planifiée");

  await tx.teamPlayer.updateMany({
    where: { playerId, ...currentAssignmentWhere(date) },
    data: { leftAt: joinedAt },
  });
  await tx.teamPlayer.create({ data: {
    playerId, teamId: input.teamId, joinedAt, shirtNumber: input.shirtNumber ?? null,
  } });
  return tx.player.findUniqueOrThrow({ where: { id: playerId }, include: playerDetailInclude });
});

// Shared by PATCH and the dedicated action: only today's current assignment is
// closed. Planned and historical assignments are intentionally retained.
const closeCurrentAssignment = (tx: Prisma.TransactionClient, id: string, date: Date) =>
  tx.teamPlayer.updateMany({
    where: { playerId: id, ...currentAssignmentWhere(date) },
    data: { leftAt: utcDate(date) },
  });

const updatePlayerOptimistic = (id: string, changes: UpdatePlayerInput) => prisma.$transaction(async (tx) => {
  const { version, birthday, ...fields } = changes;
  const result = await tx.player.updateManyAndReturn({
    where: { id, version },
    data: { ...fields, ...(birthday === undefined ? {} : { birthday: birthday ? new Date(birthday) : null }), version: { increment: 1 } },
  });
  if (!result[0]) return null;
  if (changes.isActive === false) await closeCurrentAssignment(tx, id, utcDate());
  return tx.player.findUniqueOrThrow({ where: { id }, include: playerDetailInclude });
});

const deactivatePlayer = (id: string) => prisma.$transaction(async (tx) => {
  // Serialize repeated/concurrent transitions without changing version on a no-op.
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM player WHERE id = ${id}::uuid FOR UPDATE`;
  if (!rows[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueur introuvable");
  const player = await tx.player.findUniqueOrThrow({ where: { id } });
  const closed = await closeCurrentAssignment(tx, id, utcDate());
  if (player.isActive || closed.count > 0) await tx.player.update({
    where: { id }, data: { isActive: false, version: { increment: 1 } },
  });
  return tx.player.findUniqueOrThrow({ where: { id }, include: playerDetailInclude });
});

const activatePlayer = (id: string) => prisma.player.update({
  where: { id }, data: { isActive: true, version: { increment: 1 } }, include: playerDetailInclude,
});
const deletePlayer = (id: string) => prisma.player.delete({ where: { id } });
const hasProtectedDependencies = async (id: string) => {
  const [assignment, event] = await Promise.all([
    prisma.teamPlayer.count({ where: { playerId: id } }), prisma.matchEvent.count({ where: { playerId: id } }),
  ]);
  return { assignment, event };
};

export { activatePlayer, createPlayer, createPlayerAssignment, deactivatePlayer, deletePlayer, findPlayerById, hasProtectedDependencies, listPlayers, updatePlayerOptimistic };
export type { PlayerRecord };
