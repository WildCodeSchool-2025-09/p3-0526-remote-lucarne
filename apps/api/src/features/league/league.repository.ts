import prisma from "../../../database/prisma";
import type { League } from "../../generated/prisma/client";
import type { CreateLeagueInput } from "./league.schema";
import type { ListLeaguesParams } from "@lucarne/shared";

interface LeagueListResult {
  data: League[];
  totalItems: number;
}

const createLeague = (input: CreateLeagueInput): Promise<League> =>
  prisma.league.create({
    data: input,
  });

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
    data: { isActive: false },
  });

const activateLeague = (id: string): Promise<League> =>
  prisma.league.update({
    where: { id },
    data: { isActive: true },
  });

const permanentlyDeleteLeague = (id: string): Promise<League> =>
  prisma.league.delete({ where: { id } });

export {
  activateLeague,
  createLeague,
  deactivateLeague,
  findLeagueById,
  listLeagueCountries,
  listLeagues,
  permanentlyDeleteLeague,
};
export type { LeagueListResult };
