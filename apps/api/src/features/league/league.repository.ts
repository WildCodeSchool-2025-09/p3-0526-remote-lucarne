import prisma from "../../../database/prisma";
import type { League, Prisma } from "../../generated/prisma/client";
import type { CreateLeagueInput } from "./league.schema";
import type { LeagueUpdateFields, ListLeaguesParams, PublicLeagueTeamsQuery } from "@lucarne/shared";

interface LeagueListResult {
  data: League[];
  totalItems: number;
}

interface UpdateLeagueOptimisticInput {
  leagueId: string;
  expectedVersion: number;
  changes: LeagueUpdateFields;
}

type LeagueUpdateResult =
  | { status: "UPDATED"; league: League }
  | { status: "NOT_FOUND" }
  | { status: "VERSION_CONFLICT" };

const createLeague = (input: CreateLeagueInput): Promise<League> =>
  prisma.league.create({
    data: input,
  });

const updateLeagueOptimistic = async ({
  leagueId,
  expectedVersion,
  changes,
}: UpdateLeagueOptimisticInput): Promise<LeagueUpdateResult> => {
  const data: Prisma.LeagueUpdateManyMutationInput = {
    version: { increment: 1 },
  };

  if (changes.name !== undefined) data.name = changes.name;
  if (changes.country !== undefined) data.country = changes.country;
  if (changes.logoUrl !== undefined) data.logoUrl = changes.logoUrl;
  if (changes.isActive !== undefined) data.isActive = changes.isActive;

  const result = await prisma.league.updateManyAndReturn({
    where: {
      id: leagueId,
      version: expectedVersion,
    },
    data,
  });

  if (result[0] != null) {
    return { status: "UPDATED", league: result[0] };
  }

  const league = await findLeagueById(leagueId);

  return league == null
    ? { status: "NOT_FOUND" }
    : { status: "VERSION_CONFLICT" };
};

const listLeagues = async (params: ListLeaguesParams): Promise<LeagueListResult> => {
  const where = {
    ...(params.search == null ? {} : {
      name: { contains: params.search, mode: "insensitive" as const },
    }),
    ...(params.countries == null || params.countries.length === 0
      ? {}
      : { country: { in: params.countries } }),
    ...(params.status == null || params.status === "ALL"
      ? {}
      : { isActive: params.status === "ACTIVE" }),
  };
  const skip = ((params.page ?? 1) - 1) * (params.pageSize ?? 20);

  const [data, totalItems] = await Promise.all([
    prisma.league.findMany({
      where,
      orderBy: [
        { [params.sortBy ?? "name"]: params.sortOrder ?? "asc" },
        { id: "asc" },
      ],
      skip,
      take: params.pageSize ?? 20,
    }),
    prisma.league.count({ where }),
  ]);

  return { data, totalItems };
};

const findLeagueById = (id: string): Promise<League | null> =>
  prisma.league.findUnique({ where: { id } });

const listPublicLeagueNavigation = () => prisma.league.findMany({
  where: { isActive: true },
  select: { id: true, slug: true, name: true, country: true, logoUrl: true },
  orderBy: [{ name: "asc" }, { country: "asc" }, { id: "asc" }],
});

const findPublicLeagueBySlug = (slug: string) => prisma.league.findFirst({
  where: { slug, isActive: true },
  select: {
    id: true, slug: true, name: true, country: true, logoUrl: true,
    leagueSeasons: {
      select: { isCurrent: true, season: { select: { id: true, name: true } } },
      orderBy: [{ season: { startDate: "desc" } }, { seasonId: "asc" }],
    },
  },
});

const listPublicLeagueTeams = (slug: string, seasonId: string, query: PublicLeagueTeamsQuery) =>
  prisma.$transaction(async (transaction) => {
    const edition = await transaction.leagueSeason.findFirst({
      where: { seasonId, league: { slug, isActive: true } }, select: { id: true },
    });
    if (edition == null) return null;
    const where = { leagueSeasonId: edition.id, status: "REGISTERED", team: { isActive: true } };
    const [participations, totalItems] = await Promise.all([
      transaction.participation.findMany({
        where, select: { team: { select: { id: true, name: true, logoUrl: true } } },
        orderBy: [{ team: { name: "asc" } }, { teamId: "asc" }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
      transaction.participation.count({ where }),
    ]);
    return { data: participations.map(({ team }) => team), totalItems };
  }, { isolationLevel: "RepeatableRead" });

const listLeagueCountries = async (): Promise<string[]> => {
  const countries = await prisma.league.findMany({
    distinct: ["country"],
    orderBy: { country: "asc" },
    select: { country: true },
  });

  return countries.map(({ country }) => country);
};

const deactivateLeague = (id: string): Promise<League> =>
  prisma.league.update({
    where: { id },
    data: { isActive: false, version: { increment: 1 } },
  });

const activateLeague = (id: string): Promise<League> =>
  prisma.league.update({
    where: { id },
    data: { isActive: true, version: { increment: 1 } },
  });

const getLeagueDeletionDependencies = async (id: string) => {
  const seasons = await prisma.leagueSeason.count({ where: { leagueId: id } });

  return { seasons };
};

const permanentlyDeleteLeague = async (id: string): Promise<{ deleted: boolean; seasons: number }> =>
  prisma.$transaction(async (transaction) => {
    const seasons = await transaction.leagueSeason.count({ where: { leagueId: id } });

    if (seasons > 0) return { deleted: false, seasons };

    await transaction.league.delete({ where: { id } });
    return { deleted: true, seasons: 0 };
  });

export {
  activateLeague,
  createLeague,
  deactivateLeague,
  findLeagueById,
  findPublicLeagueBySlug,
  getLeagueDeletionDependencies,
  listLeagueCountries,
  listPublicLeagueNavigation,
  listPublicLeagueTeams,
  listLeagues,
  permanentlyDeleteLeague,
  updateLeagueOptimistic,
};
export type { LeagueListResult, LeagueUpdateResult, UpdateLeagueOptimisticInput };
