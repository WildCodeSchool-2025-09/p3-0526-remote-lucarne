import type { RequestHandler } from "express";
import { publicMatchdayDetailSchema, publicMatchdayListResponseSchema, publicSeasonDetailSchema } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { getPublicMatchdayService, getPublicSeasonService, listPublicMatchdaysService } from "./season.public.service";

export const toPublicSeasonDates = <T extends { startDate: Date; endDate: Date }>(season: T) => ({
  ...season, startDate: season.startDate.toISOString().slice(0, 10), endDate: season.endDate.toISOString().slice(0, 10),
});
const toPublicMatchdayDates = <T extends { startDate: Date | null; endDate: Date | null }>(day: T) => ({
  ...day, startDate: day.startDate?.toISOString().slice(0, 10) ?? null, endDate: day.endDate?.toISOString().slice(0, 10) ?? null,
});
export const getPublicSeasonResponse: RequestHandler<{ seasonId: string }> = asyncHandler(async (request, response) => {
  const { leagueSeasons, ...season } = await getPublicSeasonService(request.params.seasonId);
  response.json(publicSeasonDetailSchema.parse({ ...toPublicSeasonDates(season), editions: leagueSeasons.map((edition) => ({
    ...edition, season: toPublicSeasonDates(edition.season),
  })) }));
});
export const getPublicMatchdayResponse: RequestHandler<{ matchdayId: string }> = asyncHandler(async (request, response) => {
  const { leagueSeason, ...day } = await getPublicMatchdayService(request.params.matchdayId);
  response.json(publicMatchdayDetailSchema.parse({ ...toPublicMatchdayDates(day), league: leagueSeason.league, season: toPublicSeasonDates(leagueSeason.season) }));
});
export const listPublicMatchdayResponses: RequestHandler<{ leagueSlug: string; seasonId: string }> = asyncHandler(async (request, response) => {
  response.json(publicMatchdayListResponseSchema.parse((await listPublicMatchdaysService(request.params.leagueSlug, request.params.seasonId)).map(toPublicMatchdayDates)));
});
