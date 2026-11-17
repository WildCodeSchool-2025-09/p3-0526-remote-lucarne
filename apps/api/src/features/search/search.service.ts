import type { PublicSearchCounts, PublicSearchQuery } from "@lucarne/shared";
import { assignmentDate } from "../../utils/assignmentPeriod";
import { publicPagination } from "../../utils/publicPagination";
import { searchPublicResources } from "./search.repository";

export async function searchPublicResourcesService(query: PublicSearchQuery) {
  const counts: PublicSearchCounts = { LEAGUE: 0, TEAM: 0, PLAYER: 0, SEASON: 0, GAME_MATCH: 0 };
  if (!query.q) return { ...publicPagination([], 0, query), counts };
  const result = await searchPublicResources(query, assignmentDate());
  for (const group of result.counts) counts[group.type] = group.count;
  const total = query.type === "ALL" ? Object.values(counts).reduce((sum, count) => sum + count, 0) : counts[query.type];
  return { ...publicPagination(result.data, total, query), counts };
}
