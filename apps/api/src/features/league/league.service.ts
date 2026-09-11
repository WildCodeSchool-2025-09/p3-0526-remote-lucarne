import type { League } from "../../generated/prisma/client";
import { createLeague } from "./league.repository";
import {
  deactivateLeague,
  findLeagueById,
  listLeagues,
  permanentlyDeleteLeague,
} from "./league.repository";
import { AppError } from "../../errors/AppError";
import { APP_ROLES } from "../../auth/appRole";
import type {
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

const deleteLeagueService = async (id: string): Promise<League> => {
  const league = await findLeagueById(id);

  if (league == null) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "League not found");
  }

  return league.isActive
    ? deactivateLeague(id)
    : permanentlyDeleteLeague(id);
};

export {
  createLeagueService,
  deleteLeagueService,
  getLeaguePermissions,
  listLeaguesService,
};
