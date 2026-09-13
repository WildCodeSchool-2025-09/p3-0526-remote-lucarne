import type { ListTeamsParams } from "@lucarne/shared";

const teamKeys = {
  all: ["team"] as const,
  details: () => [...teamKeys.all, "detail"] as const,
  detail: (teamId: string) => [...teamKeys.details(), teamId] as const,
  lists: () => [...teamKeys.all, "list"] as const,
  list: (params: ListTeamsParams) => [...teamKeys.lists(), { ...params }] as const,
  selectable: () => [...teamKeys.all, "selectable"] as const,
};

export { teamKeys };
