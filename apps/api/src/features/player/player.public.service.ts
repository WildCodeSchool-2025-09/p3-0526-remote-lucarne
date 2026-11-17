import type { PublicPlayerQuery } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { assignmentDate } from "../../utils/assignmentPeriod";
import { findPublicPlayer, listPublicPlayers } from "./player.public.repository";

export const listPublicPlayersService = (query: PublicPlayerQuery) => listPublicPlayers(query, assignmentDate());
export async function getPublicPlayerService(id: string) {
  const player = await findPublicPlayer(id, assignmentDate());
  if (!player) throw new AppError(404, "RESOURCE_NOT_FOUND", "Joueuse introuvable.");
  return player;
}
