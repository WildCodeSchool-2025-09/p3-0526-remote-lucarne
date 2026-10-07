import type { ListTeamsParams } from "@lucarne/shared";

const teamKeys = {
  rosters: () => [...teamKeys.all, "roster"] as const,
  roster: (id: string, date: string) => [...teamKeys.rosters(), id, date] as const,
  all: ["team"] as const,
  details: () => [...teamKeys.all, "detail"] as const,
  detail: (teamId: string) => [...teamKeys.details(), teamId] as const,
  lists: () => [...teamKeys.all, "list"] as const,
  list: (params: ListTeamsParams) => [...teamKeys.lists(), { ...params }] as const,
  selectable: () => [...teamKeys.all, "selectable"] as const,
};

export { teamKeys };
