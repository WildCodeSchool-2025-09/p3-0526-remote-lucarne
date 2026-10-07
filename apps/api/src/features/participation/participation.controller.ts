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
  leagueSeasonId: string;
  registrationAt: Date;
  points: number;
  rank: number | null;
  status: string;
}): Participation => ({
  teamId: participation.teamId,
  leagueSeasonId: participation.leagueSeasonId,
  registrationAt: participation.registrationAt.toISOString(),
  points: participation.points,
  rank: participation.rank,
  status: participation.status as Participation["status"],
});

const createParticipation: RequestHandler<
  { leagueSeasonId: string },
  Participation,
  CreateParticipationInput
> = asyncHandler(async (request, response) => {
  const participation = await createParticipationService(request.params.leagueSeasonId, request.body);
  response.status(201).json(toParticipationResponse(participation));
});

const getParticipationWithdrawalPreview: RequestHandler<
  { leagueSeasonId: string; teamId: string },
  ParticipationWithdrawalPreview
> = asyncHandler(async (request, response) => {
  const result = await getParticipationWithdrawalPreviewService(request.params.leagueSeasonId, request.params.teamId);
  response.json({
    teamId: result.participation.teamId,
    leagueSeasonId: result.participation.leagueSeasonId,
    scheduledMatchCount: result.scheduledMatchCount,
  });
});

const withdrawParticipation: RequestHandler<
  { leagueSeasonId: string; teamId: string },
  WithdrawParticipationResponse
> = asyncHandler(async (request, response) => {
  const result = await withdrawParticipationService(request.params.leagueSeasonId, request.params.teamId);
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
