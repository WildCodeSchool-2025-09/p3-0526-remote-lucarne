import type { RequestHandler } from "express";
import type { Team } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { createTeamService } from "./team.service";
import type { CreateTeamInput } from "@lucarne/shared";
import type { Team as PrismaTeam } from "../../generated/prisma/client";

const toTeamResponse = (team: PrismaTeam): Team => ({
  id: team.id,
  name: team.name,
  logoUrl: team.logoUrl,
  stadium: team.stadium,
  isActive: team.isActive,
  createdAt: team.createdAt.toISOString(),
});

const createTeam: RequestHandler<
  Record<string, never>,
  Team,
  CreateTeamInput
> = asyncHandler(async (request, response) => {
  if (request.user == null) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication required",
    );
  }

  const team = await createTeamService(request.body);

  response.status(201).json(toTeamResponse(team));
});

export { createTeam, toTeamResponse };
