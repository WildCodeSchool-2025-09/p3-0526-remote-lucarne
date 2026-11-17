import { matchListQuerySchema } from "@lucarne/shared";
import { publicNavigation } from "../../components/public/publicRoutes";

export function publicMatchLink(matchPublicId: string, returnTo?: string): string {
  const path = `/matches/${encodeURIComponent(matchPublicId)}`;
  return returnTo && returnTo !== publicNavigation.calendar ? `${path}?${new URLSearchParams({ returnTo })}` : path;
}

export function publicMatchReturnPath(value: string | null): string {
  if (!value || value.length > 2048) return publicNavigation.calendar;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.hash) return publicNavigation.calendar;
    const resourceCalendar = /^\/teams\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/matches$/.test(url.pathname);
    const matchday = /^\/matchdays\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(url.pathname);
    if (url.pathname !== publicNavigation.calendar && !resourceCalendar && !matchday && !/^\/leagues\/[a-z0-9]+(?:-[a-z0-9]+)*\/matches$/.test(url.pathname)) return publicNavigation.calendar;
    if (!matchListQuerySchema.safeParse(Object.fromEntries(url.searchParams)).success) return publicNavigation.calendar;
    return `${url.pathname}${url.search}`;
  } catch {
    return publicNavigation.calendar;
  }
}
