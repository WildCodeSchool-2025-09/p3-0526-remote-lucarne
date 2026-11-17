import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import { getPostgresSqlState } from "../../errors/mapErrorToAppError";
import type { AssignLeagueSeasonInput, CreateSeasonInput, ListLeagueSeasonsParams, ListSeasonsParams, UpdateSeasonInput } from "@lucarne/shared";
import { createLeagueSeason, createSeason, deleteSeason, findSeasonById, listLeagueSeasons, listSeasons, removeLeagueSeason, setCurrentSeason, updateSeasonOptimistic } from "./season.repository";
import { RESOURCE_VERSION_CONFLICT } from "@lucarne/shared";

const createSeasonService = async (input: CreateSeasonInput) => {
  try {
    return await createSeason(input);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(
        409,
        "RESOURCE_ALREADY_EXISTS",
        "A season with this name already exists",
      );
    }

    throw error;
  }
};

const listSeasonsService = (params: ListSeasonsParams) => listSeasons(params);

const listLeagueSeasonsService = (leagueId: string, params: ListLeagueSeasonsParams) => listLeagueSeasons(leagueId, params);

const createLeagueSeasonService = async (leagueId: string, input: AssignLeagueSeasonInput) => {
  try {
    const result = await createLeagueSeason(leagueId, input);
    if (result.status === "LEAGUE_NOT_FOUND") throw new AppError(404, "RESOURCE_NOT_FOUND", "League not found");
    if (result.status === "SEASON_NOT_FOUND") throw new AppError(404, "RESOURCE_NOT_FOUND", "Season not found");
    return result.edition;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw new AppError(409, "RESOURCE_ALREADY_EXISTS", "This season is already associated with the league");
      if (error.code === "P2034") throw new AppError(409, "LEAGUE_SEASON_CONFLICT", "The league seasons changed. Reload the data.");
      if ((error.code === "P2010" || error.code === "P2039") && getPostgresSqlState(error) === "57014") {
        throw new AppError(503, "CALENDAR_GENERATION_TIMEOUT", "La génération du calendrier a dépassé le délai autorisé. L'association n'a pas été créée.");
      }
    }
    throw error;
  }
};

const removeLeagueSeasonService = async (leagueId: string, seasonId: string): Promise<void> => {
  try {
    const result = await removeLeagueSeason(leagueId, seasonId);
    if (result.status === "NOT_FOUND") throw new AppError(404, "RESOURCE_NOT_FOUND", "This season is not associated with the league");
    if (result.status === "BLOCKED") throw new AppError(409, "LEAGUE_SEASON_REMOVAL_BLOCKED", `The association has ${result.matchdays} matchday(s) and ${result.participations} participation(s); its sporting history must be preserved.`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") throw new AppError(409, "LEAGUE_SEASON_REMOVAL_BLOCKED", "Sporting history prevents removing this association.");
      if (error.code === "P2034") throw new AppError(409, "LEAGUE_SEASON_CONFLICT", "The league season changed. Reload the data.");
    }
    throw error;
  }
};

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
    if (result.status === "INVALID_PERIOD") {
      throw new AppError(400, "VALIDATION_ERROR", "The end date must not precede the start date");
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const sqlState = getPostgresSqlState(error);
      if (error.code === "P2034"
        || ((error.code === "P2010" || error.code === "P2039")
          && (sqlState === "40001" || sqlState === "40P01"))) {
        throw new AppError(
          409,
          RESOURCE_VERSION_CONFLICT,
          "The season was modified by another user. Reload the data before trying again.",
        );
      }
      if (error.code === "P2002") {
        throw new AppError(409, "RESOURCE_ALREADY_EXISTS", "A season with this name already exists");
      }
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

const deleteSeasonService = async (seasonId: string): Promise<void> => {
  try {
    const result = await deleteSeason(seasonId);
    if (result.status === "NOT_FOUND") throw new AppError(404, "RESOURCE_NOT_FOUND", "Cette saison n’existe plus.");
    if (result.status === "BLOCKED") throw new AppError(409, "SEASON_DELETION_BLOCKED", `Cette saison est associée à ${result.leagues} ligue(s). Retirez les associations avant de la supprimer.`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") throw new AppError(409, "SEASON_DELETION_BLOCKED", "Une association empêche la suppression de cette saison.");
      if (error.code === "P2034") throw new AppError(409, "SEASON_CONFLICT", "La saison a changé pendant l’opération. Rechargez les données.");
      if (error.code === "P2025") throw new AppError(404, "RESOURCE_NOT_FOUND", "Cette saison n’existe plus.");
    }
    throw error;
  }
};

export { createLeagueSeasonService, createSeasonService, deleteSeasonService, getSeasonService, listLeagueSeasonsService, listSeasonsService, removeLeagueSeasonService, setCurrentSeasonService, updateSeasonService };
