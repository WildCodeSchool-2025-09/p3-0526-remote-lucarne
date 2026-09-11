import type { League, LeagueStatusFilter, ListLeaguesParams } from "@lucarne/shared";

const PAGE_SIZE = 20 as const;
const STATUS_VALUES: LeagueStatusFilter[] = ["ALL", "ACTIVE", "INACTIVE"];

function getStatus(league: League): Exclude<LeagueStatusFilter, "ALL"> {
  return league.status ?? (league.isActive ? "ACTIVE" : "INACTIVE");
}

function parseParams(searchParams: URLSearchParams): ListLeaguesParams {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawStatus = searchParams.get("status") ?? "ALL";
  const status = STATUS_VALUES.includes(rawStatus as LeagueStatusFilter)
    ? rawStatus as LeagueStatusFilter
    : "ALL";
  const sortBy = searchParams.get("sortBy") === "createdAt" ? "createdAt" : "name";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: PAGE_SIZE,
    search: searchParams.get("search") ?? undefined,
    countries: searchParams.getAll("country"),
    status,
    sortBy,
    sortOrder,
  };
}

function updateParams(
  current: URLSearchParams,
  changes: Partial<ListLeaguesParams> & { countries?: string[] },
): URLSearchParams {
  const next = new URLSearchParams(current);

  if ("search" in changes) {
    next.delete("search");
    if (changes.search?.trim()) next.set("search", changes.search.trim());
  }
  if ("status" in changes) {
    next.delete("status");
    if (changes.status != null && changes.status !== "ALL") next.set("status", changes.status);
  }
  if ("sortOrder" in changes) {
    next.delete("sortOrder");
    if (changes.sortOrder === "desc") next.set("sortOrder", "desc");
  }
  if ("sortBy" in changes) {
    next.delete("sortBy");
    if (changes.sortBy != null && changes.sortBy !== "name") next.set("sortBy", changes.sortBy);
  }
  if ("page" in changes) {
    next.delete("page");
    if (changes.page != null && changes.page > 1) next.set("page", String(changes.page));
  }
  if ("countries" in changes) {
    next.delete("country");
    for (const country of changes.countries ?? []) next.append("country", country);
  }

  return next;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export { formatDate, getStatus, parseParams, updateParams, PAGE_SIZE, STATUS_VALUES };
