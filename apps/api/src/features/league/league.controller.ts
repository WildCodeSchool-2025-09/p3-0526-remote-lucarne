import type { RequestHandler } from "express";
import type { League } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { createLeagueService } from "./league.service";
import type { CreateLeagueInput } from "./league.schema";

const createLeague: RequestHandler<
  Record<string, never>,
  League,
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
