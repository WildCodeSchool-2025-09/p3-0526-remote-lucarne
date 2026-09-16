import { Prisma } from "../../generated/prisma/client";
import type { CreateParticipationInput } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { createOrRestoreParticipation, getParticipationWithdrawalPreview, withdrawParticipation } from "./participation.repository";

const createParticipationService = async (seasonId: string, input: CreateParticipationInput) => {
  try {
    return await createOrRestoreParticipation(seasonId, input.teamId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "PARTICIPATION_ALREADY_EXISTS", "The team is already registered in this season");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError(409, "PARTICIPATION_CONFLICT", "The participation was changed by another request");
    }
    throw error;
  }
};

const getParticipationWithdrawalPreviewService = (seasonId: string, teamId: string) =>
  getParticipationWithdrawalPreview(seasonId, teamId);

const withdrawParticipationService = async (seasonId: string, teamId: string) => {
  try {
    return await withdrawParticipation(seasonId, teamId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError(409, "PARTICIPATION_CONFLICT", "The participation was changed by another request");
    }
    throw error;
  }
};

export {
  createParticipationService,
  getParticipationWithdrawalPreviewService,
  withdrawParticipationService,
};
