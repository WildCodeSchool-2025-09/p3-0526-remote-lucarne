import type { RequestHandler } from "express";
import type {
  CreateParticipationInput,
  Participation,
  ParticipationWithdrawalPreview,
  WithdrawParticipationResponse,
} from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createParticipationService,
  getParticipationWithdrawalPreviewService,
  withdrawParticipationService,
} from "./participation.service";

const toParticipationResponse = (participation: {
  teamId: string;
  seasonId: string;
  registrationAt: Date;
  points: number;
  rank: number | null;
  status: string;
}): Participation => ({
  teamId: participation.teamId,
  seasonId: participation.seasonId,
  registrationAt: participation.registrationAt.toISOString(),
  points: participation.points,
  rank: participation.rank,
  status: participation.status as Participation["status"],
});

const createParticipation: RequestHandler<
  { seasonId: string },
  Participation,
  CreateParticipationInput
> = asyncHandler(async (request, response) => {
  const participation = await createParticipationService(request.params.seasonId, request.body);
  response.status(201).json(toParticipationResponse(participation));
});

const getParticipationWithdrawalPreview: RequestHandler<
  { seasonId: string; teamId: string },
  ParticipationWithdrawalPreview
> = asyncHandler(async (request, response) => {
  const result = await getParticipationWithdrawalPreviewService(request.params.seasonId, request.params.teamId);
  response.json({
    teamId: result.participation.teamId,
    seasonId: result.participation.seasonId,
    scheduledMatchCount: result.scheduledMatchCount,
  });
});

const withdrawParticipation: RequestHandler<
  { seasonId: string; teamId: string },
  WithdrawParticipationResponse
> = asyncHandler(async (request, response) => {
  const result = await withdrawParticipationService(request.params.seasonId, request.params.teamId);
  response.json({
    participation: toParticipationResponse(result.participation),
    scheduledMatchCount: result.scheduledMatchCount,
  });
});

export {
  createParticipation,
  getParticipationWithdrawalPreview,
  toParticipationResponse,
  withdrawParticipation,
};
