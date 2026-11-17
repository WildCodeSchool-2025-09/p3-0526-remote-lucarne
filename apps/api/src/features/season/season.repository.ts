import prisma from "../../../database/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { AssignLeagueSeasonInput, CreateSeasonInput, ListLeagueSeasonsParams, ListSeasonsParams, UpdateSeasonInput } from "@lucarne/shared";

type UpdateSeasonResult =
  | { status: "UPDATED"; season: Awaited<ReturnType<typeof prisma.season.updateManyAndReturn>>[number] }
  | { status: "NOT_FOUND" }
  | { status: "VERSION_CONFLICT" }
  | { status: "INVALID_PERIOD" }
  | { status: "PERIOD_CONFLICT"; matchdays: number; matches: number };

const leagueSelect = { id: true, name: true, country: true } as const;

const createSeason = (input: CreateSeasonInput) => prisma.season.create({
  data: {
    name: input.name,
    startDate: new Date(`${input.startDate}T00:00:00.000Z`),
    endDate: new Date(`${input.endDate}T00:00:00.000Z`),
  },
});

const setCurrentSeason = (leagueId: string, seasonId: string) => prisma.$transaction(async (transaction) => {
  const edition = await transaction.leagueSeason.findUnique({
    where: { leagueId_seasonId: { leagueId, seasonId } },
    include: { league: { select: leagueSelect } },
  });
  if (edition == null || edition.isCurrent) return edition;
  await transaction.leagueSeason.updateMany({
    where: { leagueId, isCurrent: true },
    data: { isCurrent: false },
  });
  return transaction.leagueSeason.update({
    where: { id: edition.id },
    data: { isCurrent: true },
    include: { league: { select: leagueSelect } },
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

  if (endDate < startDate) return { status: "INVALID_PERIOD" };

  const [matchdays, matches] = await Promise.all([
    transaction.matchday.count({
      where: {
        leagueSeason: { seasonId },
        OR: [
          { startDate: { lt: startDate } },
          { endDate: { gt: endDate } },
        ],
      },
    }),
    transaction.gameMatch.count({
      where: {
        matchday: { leagueSeason: { seasonId } },
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
  const where: Prisma.SeasonWhereInput = {
    ...(params.leagueId == null ? {} : { leagueSeasons: { some: { leagueId: params.leagueId } } }),
    ...(params.search == null ? {} : { name: { contains: params.search, mode: "insensitive" } }),
  };
  const [data, totalItems] = await Promise.all([
    prisma.season.findMany({
      where,
      include: { leagueSeasons: { include: { league: { select: leagueSelect } }, orderBy: { league: { name: "asc" } } } },
      orderBy: [{ [params.sortBy ?? "startDate"]: params.sortOrder ?? "asc" }, { id: "asc" }],
      skip: ((params.page ?? 1) - 1) * (params.pageSize ?? 20),
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
      leagueSeasons: {
        orderBy: { league: { name: "asc" } },
        include: {
          league: { select: leagueSelect },
          participations: {
            include: { team: { select: { id: true, name: true, logoUrl: true } } },
            orderBy: { team: { name: "asc" } },
          },
          matchdays: {
            include: { _count: { select: { gameMatches: true } } },
            orderBy: { number: "asc" },
          },
        },
      },
    },
  });
  if (season == null) return null;
  const matches = await prisma.gameMatch.findMany({
    where: { status: "SCHEDULED", matchday: { leagueSeason: { seasonId: id } } },
    select: { homeTeamId: true, awayTeamId: true, matchday: { select: { leagueSeasonId: true } } },
  });
  const counts = new Map<string, number>();
  for (const match of matches) {
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (teamId == null) continue;
      const key = `${match.matchday.leagueSeasonId}:${teamId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return {
    ...season,
    leagueSeasons: season.leagueSeasons.map((edition) => ({
      ...edition,
      participations: edition.participations.map((participation) => ({
        ...participation,
        scheduledMatchCount: counts.get(`${edition.id}:${participation.teamId}`) ?? 0,
      })),
    })),
  };
};

const deleteSeason = (seasonId: string) => prisma.$transaction(async (transaction) => {
  const season = await transaction.season.findUnique({
    where: { id: seasonId },
    select: { _count: { select: { leagueSeasons: true } } },
  });
  if (season == null) return { status: "NOT_FOUND" } as const;
  if (season._count.leagueSeasons > 0) return { status: "BLOCKED", leagues: season._count.leagueSeasons } as const;
  await transaction.season.delete({ where: { id: seasonId } });
  return { status: "DELETED" } as const;
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

const listLeagueSeasons = async (leagueId: string, params: ListLeagueSeasonsParams) => {
  const where = {
    leagueId,
    ...(params.search == null ? {} : { season: { name: { contains: params.search, mode: "insensitive" as const } } }),
  };
  const [data, totalItems] = await Promise.all([
    prisma.leagueSeason.findMany({
      where,
      include: {
        league: { select: leagueSelect },
        season: true,
        _count: { select: { matchdays: true, participations: true } },
      },
      orderBy: [{ season: { [params.sortBy === "name" || params.sortBy === "endDate" || params.sortBy === "createdAt" ? params.sortBy : "startDate"]: params.sortOrder ?? "asc" } }, { id: "asc" }],
      skip: ((params.page ?? 1) - 1) * (params.pageSize ?? 20),
      take: params.pageSize ?? 20,
    }),
    prisma.leagueSeason.count({ where }),
  ]);
  return { data, totalItems };
};

const createLeagueSeason = async (leagueId: string, input: AssignLeagueSeasonInput) => prisma.$transaction(async (transaction) => {
  const [league, season] = await Promise.all([
    transaction.league.findUnique({ where: { id: leagueId }, select: { id: true } }),
    transaction.season.findUnique({ where: { id: input.seasonId }, select: { id: true } }),
  ]);
  if (league == null) return { status: "LEAGUE_NOT_FOUND" } as const;
  if (season == null) return { status: "SEASON_NOT_FOUND" } as const;
  const edition = await transaction.leagueSeason.create({
    data: { leagueId, seasonId: input.seasonId, matchdayCount: input.matchdayCount, matchesPerMatchday: input.matchesPerMatchday },
    include: { league: { select: leagueSelect } },
  });
  // Bound database execution below Prisma's default 5s transaction deadline.
  // Keep the existing count contract; do not allocate N*M objects in Node.
  await transaction.$executeRaw`SET LOCAL statement_timeout = '4s'`;
  await transaction.$executeRaw`
    WITH created_days AS (
      INSERT INTO matchday (league_season_id, number)
      SELECT ${edition.id}::uuid, day_number
      FROM generate_series(1, ${input.matchdayCount}::integer) AS days(day_number)
      RETURNING id
    )
    INSERT INTO game_match (matchday_id)
    SELECT created_days.id
    FROM created_days
    CROSS JOIN generate_series(1, ${input.matchesPerMatchday}::integer) AS slots(slot_number)
  `;
  return { status: "CREATED", edition } as const;
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

const removeLeagueSeason = (leagueId: string, seasonId: string) => prisma.$transaction(async (transaction) => {
  const edition = await transaction.leagueSeason.findUnique({
    where: { leagueId_seasonId: { leagueId, seasonId } },
    select: { id: true, _count: { select: { matchdays: true, participations: true } } },
  });
  if (edition == null) return { status: "NOT_FOUND" } as const;
  if (edition._count.matchdays > 0 || edition._count.participations > 0) {
    return { status: "BLOCKED", matchdays: edition._count.matchdays, participations: edition._count.participations } as const;
  }
  await transaction.leagueSeason.delete({ where: { id: edition.id } });
  return { status: "DELETED" } as const;
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

export { createLeagueSeason, createSeason, deleteSeason, findSeasonById, listLeagueSeasons, listSeasons, removeLeagueSeason, setCurrentSeason, updateSeasonOptimistic };
export type { UpdateSeasonResult };
