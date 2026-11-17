import type { AppRole } from "../../auth/appRole";
import { APP_ROLES } from "../../auth/appRole";
import { AppError } from "../../errors/AppError";
import type {
  CreatePlayerAssignmentInput,
  CreatePlayerInput,
  ListPlayersParams,
  Player,
  PlayerDetail,
  UpdatePlayerAssignmentInput,
  UpdatePlayerInput,
} from "@lucarne/shared";
import {
  activatePlayer,
  createPlayer,
  createPlayerAssignment,
  deactivatePlayer,
  deletePlayer,
  findPlayerById,
  listPlayers,
  updatePlayerAssignment,
  updatePlayerOptimistic,
} from "./player.repository";
import type { PlayerRecord } from "./player.repository";
import { assignmentState, assignmentDate } from "./player.assignment";

const toPlayerSummary = (player: PlayerRecord, date = assignmentDate()): Player => {
  const current = player.isActive
    ? player.teamPlayers.find(
      (assignment) => assignmentState(assignment, date) === "CURRENT",
    )
    : undefined;

  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    nationality: player.nationality,
    position: player.position,
    birthday: player.birthday?.toISOString().slice(0, 10) ?? null,
    pictureUrl: player.pictureUrl,
    isActive: player.isActive,
    version: player.version,
    createdAt: player.createdAt.toISOString(),
    activeTeam: current ? { id: current.team.id, name: current.team.name } : null,
    isSelectable: player.isActive && current != null,
  };
};

const toPlayerDetail = (player: PlayerRecord): PlayerDetail => {
  const date = assignmentDate();

  return {
    ...toPlayerSummary(player, date),
    assignments: player.teamPlayers.map((assignment) => ({
      id: assignment.id,
      team: assignment.team,
      joinedAt: assignment.joinedAt.toISOString().slice(0, 10),
      leftAt: assignment.leftAt?.toISOString().slice(0, 10) ?? null,
      shirtNumber: assignment.shirtNumber,
      state: assignmentState(assignment, date),
    })),
  };
};

const createPlayerService = async (input: CreatePlayerInput) =>
  toPlayerDetail(await createPlayer(input));

const createPlayerAssignmentService = async (
  playerId: string,
  input: CreatePlayerAssignmentInput,
) => toPlayerDetail(await createPlayerAssignment(playerId, input));

const getPlayerService = async (id: string) => {
  const player = await findPlayerById(id);

  if (!player) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueuse introuvable");

  return toPlayerDetail(player);
};

const listPlayersService = async (params: ListPlayersParams) => {
  const result = await listPlayers(params);
  const date = assignmentDate();

  return { ...result, data: result.data.map((player) => toPlayerSummary(player, date)) };
};

const updatePlayerService = async (id: string, input: UpdatePlayerInput) => {
  const result = await updatePlayerOptimistic(id, input);

  if (result) return toPlayerDetail(result);

  await getPlayerService(id);

  throw new AppError(
    409,
    "RESOURCE_VERSION_CONFLICT",
    "La joueuse a été modifiée par un autre utilisateur. Rechargez la fiche.",
  );
};

const deactivatePlayerService = async (id: string) =>
  toPlayerDetail(await deactivatePlayer(id));

const activatePlayerService = async (id: string) =>
  toPlayerDetail(await activatePlayer(id));

const deletePlayerService = async (id: string, role: AppRole) => {
  if (role !== APP_ROLES.ADMIN)
    throw new AppError(
      403,
      "INSUFFICIENT_ROLE",
      "Seuls les administrateurs peuvent supprimer une joueuse",
    );

  return deletePlayer(id);
};

const updatePlayerAssignmentService = async (
  id: string,
  assignmentId: string,
  input: UpdatePlayerAssignmentInput,
) => toPlayerDetail(await updatePlayerAssignment(id, assignmentId, input));

export {
  updatePlayerAssignmentService,
  activatePlayerService,
  createPlayerAssignmentService,
  createPlayerService,
  deactivatePlayerService,
  deletePlayerService,
  getPlayerService,
  listPlayersService,
  updatePlayerService,
};
