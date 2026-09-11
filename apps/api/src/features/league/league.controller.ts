import type { RequestHandler } from "express";
import type { League, PaginatedLeaguesResponse } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { APP_ROLES } from "../../auth/appRole";
import { activateLeagueService, createLeagueService, listLeagueCountriesService } from "./league.service";
import {
  deleteLeagueService,
  getLeagueService,
  getLeaguePermissions,
  listLeaguesService,
} from "./league.service";
import type { CreateLeagueInput, ListLeaguesParams } from "./league.schema";

const toLeagueResponse = (league: {
  id: string;
  name: string;
  country: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}): League => ({
  id: league.id,
  name: league.name,
  country: league.country,
  logoUrl: league.logoUrl,
  status: league.isActive ? "ACTIVE" : "INACTIVE",
  isActive: league.isActive,
  createdAt: league.createdAt.toISOString(),
});

const toCreatedLeagueResponse = (league: {
  id: string;
  name: string;
  country: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}) => ({
  id: league.id,
  name: league.name,
  country: league.country,
  logoUrl: league.logoUrl,
  isActive: league.isActive,
  createdAt: league.createdAt.toISOString(),
});

const createLeague: RequestHandler<
  Record<string, never>,
  League,
  CreateLeagueInput
> = asyncHandler(async (request, response) => {
  const league = await createLeagueService(request.body);

  response.status(201).json(toCreatedLeagueResponse(league));
});

const listLeagues: RequestHandler<
  Record<string, never>,
  PaginatedLeaguesResponse,
  Record<string, never>,
  ListLeaguesParams
> = asyncHandler(async (request, response) => {
  const result = await listLeaguesService(request.query);
  const page = request.query.page ?? 1;
  const pageSize = request.query.pageSize ?? 20;

  response.json({
    data: result.data.map(toLeagueResponse),
    pagination: {
      page,
      pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / pageSize),
    },
  });
});

const listLeagueCountries: RequestHandler = asyncHandler(async (_request, response) => {
  response.json(await listLeagueCountriesService());
});

const getLeague: RequestHandler<{ leagueId: string }, League> = asyncHandler(async (request, response) => {
  const league = await getLeagueService(request.params.leagueId);

  response.json(toLeagueResponse(league));
});

const deleteLeague: RequestHandler<{ leagueId: string }> = asyncHandler(async (request, response) => {
  const permissions = getLeaguePermissions(request.user?.role ?? APP_ROLES.USER);

  if (!permissions.canDelete) {
    response.status(403).json({
      error: {
        code: "INSUFFICIENT_ROLE",
        message: "User role is not authorized for this resource",
      },
    });
    return;
  }

  await deleteLeagueService(request.params.leagueId);
  response.sendStatus(204);
});

const activateLeague: RequestHandler<{ leagueId: string }> = asyncHandler(async (request, response) => {
  const permissions = getLeaguePermissions(request.user?.role ?? APP_ROLES.USER);

  if (!permissions.canDelete) {
    response.status(403).json({
      error: {
        code: "INSUFFICIENT_ROLE",
        message: "User role is not authorized for this resource",
      },
    });
    return;
  }

  const league = await activateLeagueService(request.params.leagueId);
  response.json(toLeagueResponse(league));
});

export { activateLeague, createLeague, deleteLeague, getLeague, listLeagueCountries, listLeagues, toLeagueResponse };
