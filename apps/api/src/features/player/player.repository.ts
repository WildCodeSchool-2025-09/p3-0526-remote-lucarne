import { assertPeriod, overlaps, prepareAssignment } from "../../utils/assignmentPeriod";
import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type {
  CreatePlayerAssignmentInput,
  CreatePlayerInput,
  ListPlayersParams,
  UpdatePlayerAssignmentInput,
  UpdatePlayerInput,
} from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import {
  currentAssignmentWhere,
  plannedAssignmentWhere,
  assignmentDate,
} from "./player.assignment";

const assignmentSelect = {
  id: true,
  joinedAt: true,
  leftAt: true,
  shirtNumber: true,
  team: { select: { id: true, name: true, logoUrl: true } },
} satisfies Prisma.TeamPlayerSelect;

// List summaries need the current assignment, including periods with an end date.
const playerListInclude = (date: Date) =>
  ({
    teamPlayers: { where: currentAssignmentWhere(date), select: assignmentSelect },
  }) satisfies Prisma.PlayerInclude;

const playerDetailInclude = {
  teamPlayers: {
    select: assignmentSelect,
    orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
  },
} satisfies Prisma.PlayerInclude;

type PlayerRecord = Prisma.PlayerGetPayload<{ include: typeof playerDetailInclude }>;

const findPlayerById = (id: string) =>
  prisma.player.findUnique({ where: { id }, include: playerDetailInclude });

function playerSearchWhere(search: string): Prisma.PlayerWhereInput {
  const searchTerms = search.split(/\s+/).filter(Boolean);
  const alternatives: Prisma.PlayerWhereInput[] = [
    { firstName: { contains: search, mode: "insensitive" } },
    { lastName: { contains: search, mode: "insensitive" } },
  ];

  if (searchTerms.length > 1) {
    alternatives.push({
      AND: [
        { firstName: { contains: searchTerms[0], mode: "insensitive" } },
        { lastName: { contains: searchTerms.slice(1).join(" "), mode: "insensitive" } },
      ],
    });
  }

  return { OR: alternatives };
}

const listPlayers = async (params: ListPlayersParams) => {
  const date = assignmentDate();
  const where: Prisma.PlayerWhereInput = {
    AND: [
      ...(params.search ? [playerSearchWhere(params.search)] : []),
      ...(params.status && params.status !== "ALL"
        ? [{ isActive: params.status === "ACTIVE" }]
        : []),
      ...(params.position ? [{ position: params.position }] : []),
      ...(params.teamName
        ? [
          {
            ...(params.assignmentStatus === "PLANNED" ? {} : { isActive: true }),
            teamPlayers: {
              some: {
                ...(params.assignmentStatus === "PLANNED"
                  ? plannedAssignmentWhere(date)
                  : currentAssignmentWhere(date)),
                team: {
                  name: { contains: params.teamName, mode: "insensitive" as const },
                },
              },
            },
          },
        ]
        : []),
      ...(params.selectable === true
        ? [{ isActive: true, teamPlayers: { some: currentAssignmentWhere(date) } }]
        : []),
    ],
  };
  const [data, totalItems] = await Promise.all([
    prisma.player.findMany({
      where,
      include: playerListInclude(date),
      orderBy: [
        { [params.sortBy ?? "lastName"]: params.sortOrder ?? "asc" },
        { id: "asc" },
      ],
      skip: ((params.page ?? 1) - 1) * (params.pageSize ?? 20),
      take: params.pageSize ?? 20,
    }),
    prisma.player.count({ where }),
  ]);

  return { data, totalItems };
};

const createPlayer = (input: CreatePlayerInput) =>
  prisma.$transaction(async (tx) => {
    if (input.teamId) {
      // Lock the team so a concurrent status change cannot invalidate this check.
      const teams = await tx.$queryRaw<{ is_active: boolean }[]>`
      SELECT is_active FROM team WHERE id = ${input.teamId}::uuid FOR UPDATE
    `;

      if (!teams[0]) throw new AppError(404, "TEAM_NOT_FOUND", "Équipe introuvable");
      if (
        !teams[0].is_active &&
        !(input.leftAt && new Date(input.leftAt) < assignmentDate())
      )
        throw new AppError(409, "TEAM_INACTIVE", "L’équipe est inactive");
    }

    const player = await tx.player.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        nationality: input.nationality ?? null,
        position: input.position ?? null,
        birthday: input.birthday ? new Date(input.birthday) : null,
        pictureUrl: input.pictureUrl ?? null,
      },
    });

    if (input.teamId)
      await tx.teamPlayer.create({
        data: {
          playerId: player.id,
          teamId: input.teamId,
          joinedAt: new Date(input.joinedAt!),
          leftAt: input.leftAt ? new Date(input.leftAt) : null,
          shirtNumber: input.shirtNumber ?? null,
        },
      });

    return tx.player.findUniqueOrThrow({
      where: { id: player.id },
      include: playerDetailInclude,
    });
  });

const createPlayerAssignment = (playerId: string, input: CreatePlayerAssignmentInput) =>
  prisma.$transaction(async (tx) => {
    const joinedAt = new Date(input.joinedAt);
    const leftAt = input.leftAt ? new Date(input.leftAt) : null;

    assertPeriod(joinedAt, leftAt);

    const players = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM player WHERE id = ${playerId}::uuid FOR UPDATE`;

    if (!players[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueuse introuvable");

    const teams = await tx.$queryRaw<
      { is_active: boolean }[]
    >`SELECT is_active FROM team WHERE id = ${input.teamId}::uuid FOR UPDATE`;

    if (!teams[0]) throw new AppError(404, "TEAM_NOT_FOUND", "Équipe introuvable");
    if (!teams[0].is_active && !(leftAt && leftAt < assignmentDate()))
      throw new AppError(
        409,
        "TEAM_INACTIVE",
        "Une équipe inactive ne peut recevoir qu’une affectation historique.",
      );

    const periods = await tx.teamPlayer.findMany({
      where: { playerId },
      select: { id: true, joinedAt: true, leftAt: true },
    });
    const closure = prepareAssignment(periods, joinedAt, leftAt);

    if (closure)
      await tx.teamPlayer.update({
        where: { id: closure.id },
        data: { leftAt: closure.leftAt },
      });

    await tx.teamPlayer.create({
      data: {
        playerId,
        teamId: input.teamId,
        joinedAt,
        leftAt,
        shirtNumber: input.shirtNumber ?? null,
      },
    });
    await tx.player.update({
      where: { id: playerId },
      data: { version: { increment: 1 } },
    });

    return tx.player.findUniqueOrThrow({
      where: { id: playerId },
      include: playerDetailInclude,
    });
  });

const updatePlayerAssignment = (
  playerId: string,
  assignmentId: string,
  input: UpdatePlayerAssignmentInput,
) =>
  prisma.$transaction(async (tx) => {
    const players = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM player WHERE id = ${playerId}::uuid FOR UPDATE`;

    if (!players[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueuse introuvable");

    const periods = await tx.teamPlayer.findMany({ where: { playerId } });
    const assignment = periods.find((period) => period.id === assignmentId);

    if (!assignment)
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Affectation introuvable");

    const joinedAt = new Date(input.joinedAt);
    const leftAt =
      input.leftAt === undefined
        ? assignment.leftAt
        : input.leftAt
          ? new Date(input.leftAt)
          : null;

    assertPeriod(joinedAt, leftAt);

    if (
      periods.some(
        (period) => period.id !== assignmentId && overlaps(period, { joinedAt, leftAt }),
      )
    )
      throw new AppError(
        409,
        "ASSIGNMENT_PERIOD_CONFLICT",
        "Cette période chevauche une autre affectation.",
      );

    const teams = await tx.$queryRaw<
      { is_active: boolean }[]
    >`SELECT is_active FROM team WHERE id = ${assignment.teamId}::uuid FOR UPDATE`;

    if (!teams[0]?.is_active && !(leftAt && leftAt < assignmentDate()))
      throw new AppError(
        409,
        "TEAM_INACTIVE",
        "Une équipe inactive ne peut recevoir qu’une affectation historique.",
      );

    await tx.teamPlayer.update({
      where: { id: assignmentId },
      data: { joinedAt, leftAt },
    });
    await tx.player.update({
      where: { id: playerId },
      data: { version: { increment: 1 } },
    });

    return tx.player.findUniqueOrThrow({
      where: { id: playerId },
      include: playerDetailInclude,
    });
  });

const updatePlayerOptimistic = (id: string, changes: UpdatePlayerInput) =>
  prisma.$transaction(async (tx) => {
    const { version, birthday, ...fields } = changes;
    const result = await tx.player.updateManyAndReturn({
      where: { id, version },
      data: {
        ...fields,
        ...(birthday === undefined
          ? {}
          : { birthday: birthday ? new Date(birthday) : null }),
        version: { increment: 1 },
      },
    });

    if (!result[0]) return null;

    return tx.player.findUniqueOrThrow({ where: { id }, include: playerDetailInclude });
  });

const deactivatePlayer = (id: string) =>
  prisma.$transaction(async (tx) => {
    // Serialize repeated/concurrent transitions without changing version on a no-op.
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM player WHERE id = ${id}::uuid FOR UPDATE`;

    if (!rows[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueuse introuvable");

    const player = await tx.player.findUniqueOrThrow({ where: { id } });

    if (player.isActive)
      await tx.player.update({
        where: { id },
        data: { isActive: false, version: { increment: 1 } },
      });

    return tx.player.findUniqueOrThrow({ where: { id }, include: playerDetailInclude });
  });

const activatePlayer = (id: string) =>
  prisma.player.update({
    where: { id },
    data: { isActive: true, version: { increment: 1 } },
    include: playerDetailInclude,
  });

const deletePlayer = (id: string) =>
  prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM player WHERE id = ${id}::uuid FOR UPDATE`;

    if (!rows[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueuse introuvable");
    if (await tx.matchEvent.count({ where: { playerId: id } })) {
      throw new AppError(
        409,
        "PROTECTED_DEPENDENCIES",
        "Suppression bloquée : la joueuse possède des événements de match protégés.",
      );
    }

    await tx.teamPlayer.deleteMany({ where: { playerId: id } });

    return tx.player.delete({ where: { id } });
  });

export {
  updatePlayerAssignment,
  activatePlayer,
  createPlayer,
  createPlayerAssignment,
  deactivatePlayer,
  deletePlayer,
  findPlayerById,
  listPlayers,
  updatePlayerOptimistic,
};

export type { PlayerRecord };
