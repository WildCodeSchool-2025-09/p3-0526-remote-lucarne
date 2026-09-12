import type { RequestHandler } from "express";
import type { Team } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { createTeamService, getTeamService, listTeamsService, updateTeamService } from "./team.service";
import type { CreateTeamInput, ListTeamsParams, PaginatedTeamsResponse, UpdateTeamInput } from "@lucarne/shared";
import type { Team as PrismaTeam } from "../../generated/prisma/client";

const toTeamResponse = (team: PrismaTeam): Team => ({
  id: team.id,
  name: team.name,
  logoUrl: team.logoUrl,
  stadium: team.stadium,
  isActive: team.isActive,
  createdAt: team.createdAt.toISOString(),
});

const listTeams: RequestHandler<Record<string, never>, PaginatedTeamsResponse, never, ListTeamsParams> = asyncHandler(async (request, response) => {
  const result = await listTeamsService(request.query);
  const page = request.query.page ?? 1; const pageSize = request.query.pageSize ?? 20;
  response.json({ data: result.data.map(toTeamResponse), pagination: { page, pageSize, totalItems: result.totalItems, totalPages: Math.ceil(result.totalItems / pageSize) } });
});
const getTeam: RequestHandler<{ teamId: string }, Team> = asyncHandler(async (request, response) => response.json(toTeamResponse(await getTeamService(request.params.teamId))));
const updateTeam: RequestHandler<{ teamId: string }, Team, UpdateTeamInput> = asyncHandler(async (request, response) => response.json(toTeamResponse(await updateTeamService(request.params.teamId, request.body, request.user!.role))));

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

export { createTeam, getTeam, listTeams, toTeamResponse, updateTeam };
