import { Prisma } from "../../generated/prisma/client";
import type { League } from "../../generated/prisma/client";
import { createLeague } from "./league.repository";
import {
  activateLeague,
  deactivateLeague,
  findLeagueById,
  listLeagueCountries,
  listLeagues,
  permanentlyDeleteLeague,
  updateLeagueOptimistic,
} from "./league.repository";
import { AppError } from "../../errors/AppError";
import { APP_ROLES } from "../../auth/appRole";
import { RESOURCE_VERSION_CONFLICT } from "@lucarne/shared";
import type {
  ConditionalLeagueUpdateInput,
  LeaguePermissions,
  ListLeaguesParams,
} from "@lucarne/shared";
import type { AppRole } from "../../auth/appRole";
import type { CreateLeagueInput } from "./league.schema";

const getLeaguePermissions = (role: AppRole): LeaguePermissions => ({
  canView: role === APP_ROLES.ADMIN
    || role === APP_ROLES.MODERATOR
    || role === APP_ROLES.EDITOR,
  canDelete: role === APP_ROLES.ADMIN,
});

const createLeagueService = (input: CreateLeagueInput): Promise<League> =>
  createLeague({
    ...input,
    isActive: input.isActive ?? false,
  });

const listLeaguesService = (params: ListLeaguesParams) => listLeagues(params);

const listLeagueCountriesService = (): Promise<string[]> => listLeagueCountries();

const updateLeagueService = async (
  input: ConditionalLeagueUpdateInput,
  role: AppRole,
): Promise<League> => {
  if (input.changes.isActive !== undefined && role !== APP_ROLES.ADMIN) {
    throw new AppError(
      403,
      "INSUFFICIENT_ROLE",
      "User role is not authorized to change league status",
    );
  }

  try {
    const result = await updateLeagueOptimistic({
      leagueId: input.leagueId,
      expectedVersion: input.expectedVersion,
      changes: input.changes,
    });

    if (result.status === "NOT_FOUND") {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "League not found");
    }

    if (result.status === "VERSION_CONFLICT") {
      throw new AppError(
        409,
        RESOURCE_VERSION_CONFLICT,
        "The league was modified by another user. Reload the data before trying again.",
      );
    }

    return result.league;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(
        409,
        "RESOURCE_ALREADY_EXISTS",
        "A league with this name already exists for this country",
      );
    }

    throw error;
  }
};

const getLeagueService = async (id: string): Promise<League> => {
  const league = await findLeagueById(id);

  if (league == null) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "League not found");
  }

  return league;
};

const deleteLeagueService = async (id: string): Promise<League> => {
  const league = await getLeagueService(id);

  return league.isActive
    ? deactivateLeague(id)
    : permanentlyDeleteLeague(id);
};

const activateLeagueService = async (id: string): Promise<League> => {
  const league = await getLeagueService(id);

  if (league.isActive) return league;

  return activateLeague(id);
};

export {
  activateLeagueService,
  createLeagueService,
  deleteLeagueService,
  getLeagueService,
  getLeaguePermissions,
  listLeagueCountriesService,
  listLeaguesService,
  updateLeagueService,
};
