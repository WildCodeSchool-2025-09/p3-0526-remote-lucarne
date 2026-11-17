import prisma from "../../../database/prisma";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";

const findParticipation = (leagueSeasonId: string, teamId: string) => prisma.participation.findUnique({
  where: { teamId_leagueSeasonId: { teamId, leagueSeasonId } },
});

const countScheduledMatches = (transaction: Prisma.TransactionClient, leagueSeasonId: string, teamId: string) =>
  transaction.gameMatch.count({
    where: {
      status: "SCHEDULED",
      matchday: { leagueSeasonId },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
  });

const createOrRestoreParticipation = (leagueSeasonId: string, teamId: string) => prisma.$transaction(async (transaction) => {
  const seasons = await transaction.$queryRaw<{ id: string }[]>`
    SELECT id FROM league_season WHERE id = ${leagueSeasonId}::uuid FOR UPDATE
  `;
  if (!seasons[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "League season not found");

  const teams = await transaction.$queryRaw<{ id: string; is_active: boolean }[]>`
    SELECT id, is_active FROM team WHERE id = ${teamId}::uuid FOR UPDATE
  `;
  if (!teams[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Team not found");
  if (!teams[0].is_active) throw new AppError(409, "TEAM_INACTIVE", "The team is inactive");

  const existing = await transaction.participation.findUnique({
    where: { teamId_leagueSeasonId: { teamId, leagueSeasonId } },
  });

  if (existing?.status === "REGISTERED") {
    throw new AppError(409, "PARTICIPATION_ALREADY_EXISTS", "The team is already registered in this season");
  }

  if (existing?.status === "WITHDRAWN") {
    return transaction.participation.update({
      where: { teamId_leagueSeasonId: { teamId, leagueSeasonId } },
      data: { status: "REGISTERED" },
    });
  }

  return transaction.participation.create({
    data: { teamId, leagueSeasonId, points: 0, rank: null, status: "REGISTERED" },
  });
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

const getParticipationWithdrawalPreview = async (leagueSeasonId: string, teamId: string) => {
  const participation = await findParticipation(leagueSeasonId, teamId);
  if (!participation) throw new AppError(404, "RESOURCE_NOT_FOUND", "Participation not found");

  return {
    participation,
    scheduledMatchCount: await countScheduledMatches(prisma, leagueSeasonId, teamId),
  };
};

const withdrawParticipation = (leagueSeasonId: string, teamId: string) => prisma.$transaction(async (transaction) => {
  const participation = await transaction.participation.findUnique({
    where: { teamId_leagueSeasonId: { teamId, leagueSeasonId } },
  });
  if (!participation) throw new AppError(404, "RESOURCE_NOT_FOUND", "Participation not found");

  const scheduledMatchCount = await countScheduledMatches(transaction, leagueSeasonId, teamId);
  const updatedParticipation = participation.status === "WITHDRAWN"
    ? participation
    : await transaction.participation.update({
      where: { teamId_leagueSeasonId: { teamId, leagueSeasonId } },
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
