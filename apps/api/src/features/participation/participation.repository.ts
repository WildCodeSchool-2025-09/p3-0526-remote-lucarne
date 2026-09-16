import prisma from "../../../database/prisma";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";

const findParticipation = (seasonId: string, teamId: string) => prisma.participation.findUnique({
  where: { teamId_seasonId: { teamId, seasonId } },
});

const countScheduledMatches = (transaction: Prisma.TransactionClient, seasonId: string, teamId: string) =>
  transaction.gameMatch.count({
    where: {
      status: "SCHEDULED",
      matchday: { seasonId },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
  });

const createOrRestoreParticipation = (seasonId: string, teamId: string) => prisma.$transaction(async (transaction) => {
  const seasons = await transaction.$queryRaw<{ id: string }[]>`
    SELECT id FROM season WHERE id = ${seasonId}::uuid FOR UPDATE
  `;
  if (!seasons[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Season not found");

  const teams = await transaction.$queryRaw<{ id: string; is_active: boolean }[]>`
    SELECT id, is_active FROM team WHERE id = ${teamId}::uuid FOR UPDATE
  `;
  if (!teams[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Team not found");
  if (!teams[0].is_active) throw new AppError(409, "TEAM_INACTIVE", "The team is inactive");

  const existing = await transaction.participation.findUnique({
    where: { teamId_seasonId: { teamId, seasonId } },
  });

  if (existing?.status === "REGISTERED") {
    throw new AppError(409, "PARTICIPATION_ALREADY_EXISTS", "The team is already registered in this season");
  }

  if (existing?.status === "WITHDRAWN") {
    return transaction.participation.update({
      where: { teamId_seasonId: { teamId, seasonId } },
      data: { status: "REGISTERED" },
    });
  }

  return transaction.participation.create({
    data: { teamId, seasonId, points: 0, rank: null, status: "REGISTERED" },
  });
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

const getParticipationWithdrawalPreview = async (seasonId: string, teamId: string) => {
  const participation = await findParticipation(seasonId, teamId);
  if (!participation) throw new AppError(404, "RESOURCE_NOT_FOUND", "Participation not found");

  return {
    participation,
    scheduledMatchCount: await countScheduledMatches(prisma, seasonId, teamId),
  };
};

const withdrawParticipation = (seasonId: string, teamId: string) => prisma.$transaction(async (transaction) => {
  const participation = await transaction.participation.findUnique({
    where: { teamId_seasonId: { teamId, seasonId } },
  });
  if (!participation) throw new AppError(404, "RESOURCE_NOT_FOUND", "Participation not found");

  const scheduledMatchCount = await countScheduledMatches(transaction, seasonId, teamId);
  const updatedParticipation = participation.status === "WITHDRAWN"
    ? participation
    : await transaction.participation.update({
      where: { teamId_seasonId: { teamId, seasonId } },
      data: { status: "WITHDRAWN" },
    });

  return { participation: updatedParticipation, scheduledMatchCount };
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

export {
  countScheduledMatches,
  createOrRestoreParticipation,
  findParticipation,
  getParticipationWithdrawalPreview,
  withdrawParticipation,
};
