import { Prisma } from "../../generated/prisma/client";
import type { League } from "../../generated/prisma/client";
import { createLeague } from "./league.repository";
import {
  activateLeague,
  deactivateLeague,
  findLeagueById,
  getLeagueDeletionDependencies,
  listLeagueCountries,
  listLeagues,
  permanentlyDeleteLeague,
  updateLeagueOptimistic,
} from "./league.repository";
import { AppError } from "../../errors/AppError";
import { RESOURCE_VERSION_CONFLICT } from "@lucarne/shared";
import type {
  ConditionalLeagueUpdateInput,
  ListLeaguesParams,
} from "@lucarne/shared";
import type { AppRole } from "../../auth/appRole";
import type { CreateLeagueInput } from "./league.schema";

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
  void role;
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

const deactivateLeagueService = async (id: string): Promise<League> => {
  const league = await getLeagueService(id);

  return league.isActive ? deactivateLeague(id) : league;
};

const permanentlyDeleteLeagueService = async (id: string): Promise<void> => {
  await getLeagueService(id);
  const dependencies = await getLeagueDeletionDependencies(id);

  if (dependencies.seasons > 0) {
    throw new AppError(
      409,
      "LEAGUE_DELETION_BLOCKED",
      "League cannot be permanently deleted while it has seasons",
      [{ field: "seasons", message: `${dependencies.seasons} season(s) block permanent deletion` }],
    );
  }

  let result: Awaited<ReturnType<typeof permanentlyDeleteLeague>>;

  try {
    result = await permanentlyDeleteLeague(id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      const currentDependencies = await getLeagueDeletionDependencies(id);
      throw new AppError(
        409,
        "LEAGUE_DELETION_BLOCKED",
        "League cannot be permanently deleted because a protected dependency was added",
        [{ field: "seasons", message: `${currentDependencies.seasons} season(s) block permanent deletion` }],
      );
    }

    throw error;
  }

  if (!result.deleted) {
    throw new AppError(
      409,
      "LEAGUE_DELETION_BLOCKED",
      "League cannot be permanently deleted while it has seasons",
      [{ field: "seasons", message: `${result.seasons} season(s) block permanent deletion` }],
    );
  }
};

const activateLeagueService = async (id: string): Promise<League> => {
  const league = await getLeagueService(id);

  if (league.isActive) return league;

  return activateLeague(id);
};

export {
  activateLeagueService,
  createLeagueService,
  deactivateLeagueService,
  getLeagueService,
  listLeagueCountriesService,
  listLeaguesService,
  permanentlyDeleteLeagueService,
  updateLeagueService,
};
