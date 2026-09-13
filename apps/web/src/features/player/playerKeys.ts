import type { ListPlayersParams } from "@lucarne/shared";

const playerKeys = {
  activeTeams: () => [...playerKeys.all, "active-teams"] as const,
  all: ["player"] as const,
  details: () => [...playerKeys.all, "detail"] as const,
  detail: (playerId: string) => [...playerKeys.details(), playerId] as const,
  lists: () => [...playerKeys.all, "list"] as const,
  list: (params: ListPlayersParams) => [...playerKeys.lists(), { ...params }] as const,
};

export { playerKeys };
