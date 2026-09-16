import prisma from "../../../database/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { CreateSeasonInput, ListSeasonsParams, UpdateSeasonInput } from "@lucarne/shared";

type UpdateSeasonResult =
  | { status: "UPDATED"; season: Awaited<ReturnType<typeof prisma.season.updateManyAndReturn>>[number] }
  | { status: "NOT_FOUND" }
  | { status: "VERSION_CONFLICT" }
  | { status: "PERIOD_CONFLICT"; matchdays: number; matches: number };

const findLeagueForSeasonCreation = (id: string) => prisma.league.findUnique({
  where: { id },
  select: { id: true, isActive: true },
});

const createSeason = (leagueId: string, input: CreateSeasonInput) => prisma.season.create({
  data: {
    leagueId,
    name: input.name,
    startDate: new Date(`${input.startDate}T00:00:00.000Z`),
    endDate: new Date(`${input.endDate}T00:00:00.000Z`),
    isActive: false,
  },
});

const setCurrentSeason = (leagueId: string, seasonId: string) => prisma.$transaction(async (transaction) => {
  const season = await transaction.season.findFirst({
    where: { id: seasonId, leagueId },
  });

  if (season == null || season.isActive) {
    return season;
  }

  await transaction.season.updateMany({
    where: { leagueId, isActive: true },
    data: { isActive: false, version: { increment: 1 } },
  });

  return transaction.season.update({
    where: { id: seasonId },
    data: { isActive: true, version: { increment: 1 } },
  });
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

const updateSeasonOptimistic = async (
  seasonId: string,
  changes: UpdateSeasonInput,
): Promise<UpdateSeasonResult> => prisma.$transaction(async (transaction) => {
  const current = await transaction.season.findUnique({
    where: { id: seasonId },
    select: { startDate: true, endDate: true, version: true },
  });

  if (current == null) return { status: "NOT_FOUND" };
  if (current.version !== changes.version) return { status: "VERSION_CONFLICT" };

  const startDate = changes.startDate == null
    ? current.startDate
    : new Date(`${changes.startDate}T00:00:00.000Z`);
  const endDate = changes.endDate == null
    ? current.endDate
    : new Date(`${changes.endDate}T00:00:00.000Z`);

  const [matchdays, matches] = await Promise.all([
    transaction.matchday.count({
      where: {
        seasonId,
        OR: [
          { startDate: { lt: startDate } },
          { endDate: { gt: endDate } },
        ],
      },
    }),
    transaction.gameMatch.count({
      where: {
        matchday: { seasonId },
        OR: [
          { matchDate: { lt: startDate } },
          { matchDate: { gt: endDate } },
        ],
      },
    }),
  ]);

  if (matchdays > 0 || matches > 0) {
    return { status: "PERIOD_CONFLICT", matchdays, matches };
  }

  const data: Prisma.SeasonUpdateManyMutationInput = {
    version: { increment: 1 },
  };
  if (changes.name !== undefined) data.name = changes.name;
  if (changes.startDate !== undefined) data.startDate = startDate;
  if (changes.endDate !== undefined) data.endDate = endDate;

  const result = await transaction.season.updateManyAndReturn({
    where: { id: seasonId, version: changes.version },
    data,
  });

  return result[0] == null
    ? { status: "VERSION_CONFLICT" }
    : { status: "UPDATED", season: result[0] };
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

const listSeasons = async (params: ListSeasonsParams) => {
  const where = {
    ...(params.leagueId == null ? {} : { leagueId: params.leagueId }),
    ...(params.search == null ? {} : {
      name: { contains: params.search, mode: "insensitive" as const },
    }),
    ...(params.status == null || params.status === "ALL"
      ? {}
      : { isActive: params.status === "CURRENT" }),
  };
  const skip = ((params.page ?? 1) - 1) * (params.pageSize ?? 20);

  const [data, totalItems] = await Promise.all([
    prisma.season.findMany({
      where,
      orderBy: [
        { [params.sortBy ?? "startDate"]: params.sortOrder ?? "asc" },
        { id: "asc" },
      ],
      skip,
      take: params.pageSize ?? 20,
    }),
    prisma.season.count({ where }),
  ]);

  return { data, totalItems };
};

const findSeasonById = async (id: string) => {
  const season = await prisma.season.findUnique({
    where: { id },
    include: {
      league: {
        select: { id: true, name: true, country: true },
      },
      participations: {
        select: {
          teamId: true,
          seasonId: true,
          registrationAt: true,
          points: true,
          rank: true,
          status: true,
          team: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
        orderBy: { team: { name: "asc" } },
      },
      matchdays: {
        select: {
          id: true,
          number: true,
          name: true,
          startDate: true,
          endDate: true,
          _count: { select: { gameMatches: true } },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (season == null) return null;

  const scheduledMatches = await prisma.gameMatch.findMany({
    where: { status: "SCHEDULED", matchday: { seasonId: id } },
    select: { homeTeamId: true, awayTeamId: true },
  });
  const scheduledMatchCounts = new Map<string, number>();
  for (const match of scheduledMatches) {
    scheduledMatchCounts.set(match.homeTeamId, (scheduledMatchCounts.get(match.homeTeamId) ?? 0) + 1);
    scheduledMatchCounts.set(match.awayTeamId, (scheduledMatchCounts.get(match.awayTeamId) ?? 0) + 1);
  }

  return {
    ...season,
    participations: season.participations.map((participation) => ({
      ...participation,
      scheduledMatchCount: scheduledMatchCounts.get(participation.teamId) ?? 0,
    })),
  };
};

export { createSeason, findLeagueForSeasonCreation, findSeasonById, listSeasons, setCurrentSeason, updateSeasonOptimistic };
export type { UpdateSeasonResult };
