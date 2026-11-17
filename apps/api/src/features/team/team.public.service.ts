import { AppError } from "../../errors/AppError";
import { assignmentDate } from "../../utils/assignmentPeriod";
import { findPublicTeam, findPublicTeamRoster, listPublicTeams } from "./team.public.repository";
import type { PublicTeamQuery } from "@lucarne/shared";

export const listPublicTeamsService = (query: PublicTeamQuery) => listPublicTeams(query);

export async function getPublicTeamService(id: string) {
  const team = await findPublicTeam(id);
  if (!team) throw new AppError(404, "RESOURCE_NOT_FOUND", "Équipe introuvable.");
  return team;
}

export async function getPublicTeamRosterService(id: string) {
  const date = assignmentDate();
  const roster = await findPublicTeamRoster(id, date);
  if (!roster) throw new AppError(404, "RESOURCE_NOT_FOUND", "Équipe introuvable.");
  return { date, roster };
}
