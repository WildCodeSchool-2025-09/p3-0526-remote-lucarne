import { Prisma } from "../../generated/prisma/client";
import type { AppRole } from "../../auth/appRole";
import { APP_ROLES } from "../../auth/appRole";
import { AppError } from "../../errors/AppError";
import type { CreatePlayerInput, ListPlayersParams, UpdatePlayerInput } from "@lucarne/shared";
import { activatePlayer, createPlayer, deactivatePlayer, deletePlayer, findDuplicate, findPlayerById, hasProtectedDependencies, listPlayers, updatePlayerOptimistic } from "./player.repository";
import prisma from "../../../database/prisma";

const createPlayerService = async (input: CreatePlayerInput) => { const duplicate = await findDuplicate(input); if (duplicate) throw new AppError(409, "RESOURCE_ALREADY_EXISTS", "Un joueur portant ce nom existe déjà"); if (input.teamId) { const team = await prisma.team.findUnique({ where: { id: input.teamId } }); if (!team) throw new AppError(404, "TEAM_NOT_FOUND", "Équipe introuvable"); if (!team.isActive) throw new AppError(409, "TEAM_INACTIVE", "L’équipe est inactive"); } try { return await createPlayer(input); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError(409, "RESOURCE_ALREADY_EXISTS", "Le joueur est déjà affecté à une équipe"); throw error; } };
const getPlayerService = async (id: string) => { const player = await findPlayerById(id); if (!player) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueur introuvable"); return player; };
const listPlayersService = (params: ListPlayersParams) => listPlayers(params);
const updatePlayerService = async (id: string, input: UpdatePlayerInput) => { const duplicate = input.firstName === undefined && input.lastName === undefined ? null : await findDuplicate(input, id); if (duplicate) throw new AppError(409, "RESOURCE_ALREADY_EXISTS", "Un joueur portant ce nom existe déjà"); const result = await updatePlayerOptimistic(id, input); if (result) return getPlayerService(id); const existing = await findPlayerById(id); if (!existing) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueur introuvable"); throw new AppError(409, "RESOURCE_VERSION_CONFLICT", "Le joueur a été modifié par un autre utilisateur. Rechargez la fiche."); };
const deactivatePlayerService = async (id: string) => { await getPlayerService(id); return deactivatePlayer(id); };
const activatePlayerService = async (id: string) => { await getPlayerService(id); return activatePlayer(id); };
const deletePlayerService = async (id: string, role: AppRole) => { if (role !== APP_ROLES.ADMIN) throw new AppError(403, "INSUFFICIENT_ROLE", "Seuls les administrateurs peuvent supprimer un joueur"); await getPlayerService(id); const dependencies = await hasProtectedDependencies(id); if (dependencies.assignment || dependencies.event) throw new AppError(409, "PROTECTED_DEPENDENCIES", "Suppression bloquée : le joueur possède des affectations ou des événements protégés"); return deletePlayer(id); };
export { activatePlayerService, createPlayerService, deactivatePlayerService, deletePlayerService, getPlayerService, listPlayersService, updatePlayerService };
