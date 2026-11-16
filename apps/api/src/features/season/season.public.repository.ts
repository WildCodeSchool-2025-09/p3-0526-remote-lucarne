import prisma from "../../../database/prisma";
import { publicLeagueSelect, publicMatchdaySelect } from "../league/league.public.repository";

export const publicSeasonSelect = { id: true, name: true, startDate: true, endDate: true } as const;
export const publicEditionSelect = { league: { select: publicLeagueSelect }, season: { select: publicSeasonSelect }, isCurrent: true } as const;

export const findPublicSeason = (id: string) => prisma.$transaction((transaction) => transaction.season.findFirst({
  where: { id, leagueSeasons: { some: { league: { isActive: true } } } },
  select: { ...publicSeasonSelect, leagueSeasons: {
    where: { league: { isActive: true } }, select: publicEditionSelect,
    orderBy: [{ league: { name: "asc" } }, { leagueId: "asc" }],
  } },
}), { isolationLevel: "RepeatableRead" });
export const findPublicMatchday = (id: string) => prisma.$transaction((transaction) => transaction.matchday.findFirst({
  where: { id, isActive: true, leagueSeason: { league: { isActive: true } } },
  select: { ...publicMatchdaySelect, leagueSeason: { select: publicEditionSelect } },
}), { isolationLevel: "RepeatableRead" });
