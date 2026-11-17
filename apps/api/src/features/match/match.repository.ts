import type { MatchListQuery } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";

const matchInclude = { matchday: { include: { leagueSeason: true } } } as const;

type MatchRecord = Prisma.GameMatchGetPayload<{ include: typeof matchInclude }>;

const publicMatchSelect = {
  matchPublicId: true,
  matchDate: true,
  startTime: true,
  stadium: true,
  status: true,
  homeScore: true,
  awayScore: true,
  homeTeam: { select: { id: true, name: true, logoUrl: true } },
  awayTeam: { select: { id: true, name: true, logoUrl: true } },
  matchday: {
    select: {
      id: true,
      number: true,
      name: true,
      leagueSeason: {
        select: {
          league: { select: { id: true, slug: true, name: true, country: true } },
          season: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

type PublicMatchRecord = Prisma.GameMatchGetPayload<{ select: typeof publicMatchSelect }>;

const publicMatchVisibility: Prisma.GameMatchWhereInput = {
  isActive: true, isPublished: true,
  homeTeam: { isActive: true }, awayTeam: { isActive: true },
  matchday: { isActive: true, leagueSeason: { league: { isActive: true } } },
};

const findMatch = (id: string) => prisma.gameMatch.findFirst({ where: { id, isActive: true }, include: matchInclude });

const buildMatchFilters = (query: MatchListQuery): Prisma.GameMatchWhereInput => ({
  isActive: true,
  matchdayId: query.matchdayId,
  status: query.status,
  matchday: { leagueSeason: { leagueId: query.leagueId, seasonId: query.seasonId } },
  ...(query.teamId ? { OR: [{ homeTeamId: query.teamId }, { awayTeamId: query.teamId }] } : {}),
  ...(query.dateFrom || query.dateTo ? {
    matchDate: {
      gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
      lte: query.dateTo ? new Date(query.dateTo) : undefined,
    },
  } : {}),
});

const buildMatchOrderBy = (query: MatchListQuery): Prisma.GameMatchOrderByWithRelationInput[] => [
  { matchDate: { sort: query.sortOrder, nulls: "last" } },
  { startTime: { sort: query.sortOrder, nulls: "last" } },
  { id: "asc" },
];

const listMatches = async (query: MatchListQuery) => {
  const where = buildMatchFilters(query);
  const [data, totalItems] = await prisma.$transaction(
    [
      prisma.gameMatch.findMany({
        where,
        include: matchInclude,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: buildMatchOrderBy(query),
      }),
      prisma.gameMatch.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return { data, totalItems };
};

const findPublicMatch = (matchPublicId: string) => prisma.gameMatch.findFirst({
  where: { matchPublicId, ...publicMatchVisibility },
  select: publicMatchSelect,
});

const listPublicMatches = async (query: MatchListQuery) => {
  const where: Prisma.GameMatchWhereInput = { AND: [buildMatchFilters(query), publicMatchVisibility] };
  const [data, totalItems] = await prisma.$transaction(
    [
      prisma.gameMatch.findMany({
        where,
        select: publicMatchSelect,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: buildMatchOrderBy(query),
      }),
      prisma.gameMatch.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return { data, totalItems };
};

const createMatch = (matchdayId: string) => prisma.gameMatch.create({ data: { matchdayId }, include: matchInclude });

// Lock before reading the state used by business validation. The conditional
// update also protects the version; triggers arbitrate conflicts across matches.
const mutateMatch = (
  id: string,
  version: number,
  buildChanges: (current: MatchRecord) => Prisma.GameMatchUncheckedUpdateManyInput,
) =>
  prisma.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM game_match WHERE id = ${id}::uuid AND is_active = true FOR UPDATE`;

      const current = await transaction.gameMatch.findFirst({ where: { id, isActive: true }, include: matchInclude });

      if (!current) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Match introuvable.");
      }
      if (current.version !== version) {
        throw new AppError(
          409,
          "RESOURCE_VERSION_CONFLICT",
          "Ce match a été modifié. Rechargez-le avant de réessayer.",
        );
      }

      const data = buildChanges(current);
      const updated = await transaction.gameMatch.updateMany({
        where: { id, version, isActive: true },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new AppError(
          409,
          "RESOURCE_VERSION_CONFLICT",
          "Ce match a été modifié. Rechargez-le avant de réessayer.",
        );
      }

      return transaction.gameMatch.findUniqueOrThrow({ where: { id }, include: matchInclude });
    },
    { isolationLevel: "ReadCommitted" },
  );

export {
  publicMatchVisibility,
  createMatch,
  findMatch,
  findPublicMatch,
  listMatches,
  listPublicMatches,
  mutateMatch,
};

export type { MatchRecord, PublicMatchRecord };
