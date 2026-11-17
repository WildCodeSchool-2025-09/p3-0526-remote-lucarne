import type { MatchListQuery } from "@lucarne/shared";

const matchKeys = {
  all: ["match"] as const,
  list: (params: MatchListQuery) => [...matchKeys.all, "list", params] as const,
  detail: (id: string) => [...matchKeys.all, "detail", id] as const,
  publicList: (params: MatchListQuery) =>
    [...matchKeys.all, "public", "list", params] as const,
  publicDetail: (matchPublicId: string) =>
    [...matchKeys.all, "public", "detail", matchPublicId] as const,
};

export { matchKeys };
