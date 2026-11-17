import { useQuery } from "@tanstack/react-query";
import { getPublicMatchday, getPublicSeason, listPublicMatchdays } from "../../../services/publicSeason.service";
import { seasonKeys } from "../seasonKeys";

export const usePublicSeason = (id: string) => useQuery({ queryKey: [...seasonKeys.detail(id), "public"], queryFn: () => getPublicSeason(id) });
export const usePublicMatchday = (id: string) => useQuery({ queryKey: [...seasonKeys.all, "public", "matchday", id], queryFn: () => getPublicMatchday(id) });
export const usePublicMatchdays = (slug: string, seasonId: string) => useQuery({ queryKey: [...seasonKeys.all, "public", "matchdays", slug, seasonId], queryFn: () => listPublicMatchdays(slug, seasonId), enabled: Boolean(slug && seasonId) });
