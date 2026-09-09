import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createLeagueService } from "./league.service";
import type { CreateLeagueInput } from "./league.schema";
import type { LeagueResponse } from "./league.types";

const createLeague: RequestHandler<
  Record<string, never>,
  LeagueResponse,
  CreateLeagueInput
> = asyncHandler(async (request, response) => {
  const league = await createLeagueService(request.body);

  response.status(201).json({
    id: league.id,
    name: league.name,
    country: league.country,
    logoUrl: league.logoUrl,
    isActive: league.isActive,
    createdAt: league.createdAt.toISOString(),
  });
});

export { createLeague };
