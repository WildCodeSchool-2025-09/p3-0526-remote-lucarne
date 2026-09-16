import type { ListSeasonsParams } from "@lucarne/shared";

const seasonKeys = {
  all: ["season"] as const,
  details: () => [...seasonKeys.all, "detail"] as const,
  detail: (seasonId: string) => [...seasonKeys.details(), seasonId] as const,
  lists: () => [...seasonKeys.all, "list"] as const,
  list: (params: ListSeasonsParams) => [...seasonKeys.lists(), params] as const,
};

export { seasonKeys };
