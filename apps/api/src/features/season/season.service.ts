import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import type { CreateSeasonInput, ListSeasonsParams, UpdateSeasonInput } from "@lucarne/shared";
import { createSeason, findLeagueForSeasonCreation, findSeasonById, listSeasons, setCurrentSeason, updateSeasonOptimistic } from "./season.repository";
import { RESOURCE_VERSION_CONFLICT } from "@lucarne/shared";

const createSeasonService = async (leagueId: string, input: CreateSeasonInput) => {
  const league = await findLeagueForSeasonCreation(leagueId);

  if (league == null) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "League not found");
  }

  if (!league.isActive) {
    throw new AppError(
      409,
      "LEAGUE_INACTIVE",
      "A season can only be created for an active league",
    );
  }

  try {
    return await createSeason(leagueId, input);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(
        409,
        "RESOURCE_ALREADY_EXISTS",
        "A season with this name already exists for this league",
      );
    }

    throw error;
  }
};

const listSeasonsService = (params: ListSeasonsParams) => listSeasons(params);

const setCurrentSeasonService = async (leagueId: string, seasonId: string) => {
  try {
    const season = await setCurrentSeason(leagueId, seasonId);

    if (season == null) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Season not found for this league");
    }

    return season;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError(
        409,
        "CURRENT_SEASON_CONFLICT",
        "The current season was changed by another request",
      );
    }

    throw error;
  }
};

const updateSeasonService = async (seasonId: string, changes: UpdateSeasonInput) => {
  try {
    const result = await updateSeasonOptimistic(seasonId, changes);

    if (result.status === "NOT_FOUND") {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Season not found");
    }
    if (result.status === "VERSION_CONFLICT") {
      throw new AppError(
        409,
        RESOURCE_VERSION_CONFLICT,
        "The season was modified by another user. Reload the data before trying again.",
      );
    }
    if (result.status === "PERIOD_CONFLICT") {
      throw new AppError(
        409,
        "SEASON_PERIOD_CONFLICT",
        "The season period cannot exclude existing matchdays or matches",
        [
          ...(result.matchdays > 0 ? [{ field: "startDate/endDate", message: `${result.matchdays} matchday(s) fall outside the new season period` }] : []),
          ...(result.matches > 0 ? [{ field: "startDate/endDate", message: `${result.matches} match(es) fall outside the new season period` }] : []),
        ],
      );
    }

    return result.season;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "RESOURCE_ALREADY_EXISTS", "A season with this name already exists for this league");
    }

    throw error;
  }
};

const getSeasonService = async (id: string) => {
  const season = await findSeasonById(id);

  if (season == null) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "Season not found");
  }

  return season;
};

export { createSeasonService, getSeasonService, listSeasonsService, setCurrentSeasonService, updateSeasonService };
