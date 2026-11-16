import { publicSearchQuerySchema } from "@lucarne/shared";
import type { PublicSearchResult } from "@lucarne/shared";
import { publicNavigation } from "../../components/public/publicRoutes";

const positions = new Map<string, number>();
export function rememberPublicSearchPosition(path: string) {
  if (positions.size >= 20 && !positions.has(path)) positions.delete(positions.keys().next().value ?? "");
  positions.set(path, window.scrollY);
}
export const publicSearchPosition = (path: string) => positions.get(path);

export function publicSearchReturnPath(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== publicNavigation.search || url.hash) return null;
    return publicSearchQuerySchema.safeParse(Object.fromEntries(url.searchParams)).success ? `${url.pathname}${url.search}` : null;
  } catch { return null; }
}
export function publicSearchResultPath(result: PublicSearchResult): string {
  switch (result.type) {
    case "LEAGUE": return publicNavigation.league(result.slug);
    case "TEAM": return publicNavigation.team(result.id);
    case "PLAYER": return publicNavigation.player(result.id);
    case "SEASON": return publicNavigation.season(result.id);
    case "GAME_MATCH": return `/matches/${encodeURIComponent(result.id)}`;
  }
}
