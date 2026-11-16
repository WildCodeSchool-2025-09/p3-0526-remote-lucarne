import { AppError } from "../../errors/AppError";
import { findPublicLeagueMatchdays } from "../league/league.public.repository";
import { findPublicMatchday, findPublicSeason } from "./season.public.repository";

export async function getPublicSeasonService(id: string) {
  const season = await findPublicSeason(id);
  if (!season) throw new AppError(404, "RESOURCE_NOT_FOUND", "Saison introuvable.");
  return season;
}
export async function getPublicMatchdayService(id: string) {
  const matchday = await findPublicMatchday(id);
  if (!matchday) throw new AppError(404, "RESOURCE_NOT_FOUND", "Journée introuvable.");
  return matchday;
}
export async function listPublicMatchdaysService(leagueSlug: string, seasonId: string) {
  const edition = await findPublicLeagueMatchdays(leagueSlug, seasonId);
  if (!edition) throw new AppError(404, "RESOURCE_NOT_FOUND", "Cette saison n’est pas disponible pour cette ligue.");
  return edition.matchdays;
}
