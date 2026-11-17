import prisma from "../../../database/prisma";

export const publicLeagueSelect = { id: true, slug: true, name: true, country: true, logoUrl: true } as const;
export const publicMatchdaySelect = { id: true, number: true, name: true, startDate: true, endDate: true } as const;

export const findPublicLeagueMatchdays = (leagueSlug: string, seasonId: string) => prisma.$transaction((transaction) => transaction.leagueSeason.findFirst({
  where: { seasonId, league: { slug: leagueSlug, isActive: true } },
  select: { matchdays: { where: { isActive: true }, select: publicMatchdaySelect, orderBy: [{ number: "asc" }, { id: "asc" }] } },
}), { isolationLevel: "RepeatableRead" });
