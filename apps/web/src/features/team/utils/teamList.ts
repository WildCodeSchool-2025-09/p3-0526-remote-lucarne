import type { ListTeamsParams, TeamSortField, TeamStatusFilter } from "@lucarne/shared";

const PAGE_SIZE = 20 as const;
const STATUS_VALUES: TeamStatusFilter[] = ["ALL", "ACTIVE", "INACTIVE"];
const SORT_FIELDS: TeamSortField[] = ["name", "createdAt"];

function parseParams(searchParams: URLSearchParams): ListTeamsParams {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawStatus = searchParams.get("status") ?? "ALL";
  const rawSortBy = searchParams.get("sortBy") ?? "name";

  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: PAGE_SIZE,
    search: searchParams.get("search") ?? undefined,
    status: STATUS_VALUES.includes(rawStatus as TeamStatusFilter) ? rawStatus as TeamStatusFilter : "ALL",
    sortBy: SORT_FIELDS.includes(rawSortBy as TeamSortField) ? rawSortBy as TeamSortField : "name",
    sortOrder: searchParams.get("sortOrder") === "desc" ? "desc" : "asc",
  };
}

function updateParams(current: URLSearchParams, changes: Partial<ListTeamsParams>): URLSearchParams {
  const next = new URLSearchParams(current);

  if ("search" in changes) {
    next.delete("search");
    if (changes.search?.trim()) next.set("search", changes.search.trim());
  }
  if ("status" in changes) {
    next.delete("status");
    if (changes.status != null && changes.status !== "ALL") next.set("status", changes.status);
  }
  if ("sortBy" in changes) {
    next.delete("sortBy");
    if (changes.sortBy != null && changes.sortBy !== "name") next.set("sortBy", changes.sortBy);
  }
  if ("sortOrder" in changes) {
    next.delete("sortOrder");
    if (changes.sortOrder === "desc") next.set("sortOrder", changes.sortOrder);
  }
  if ("page" in changes) {
    next.delete("page");
    if (changes.page != null && changes.page > 1) next.set("page", String(changes.page));
  }

  return next;
}

export { PAGE_SIZE, parseParams, updateParams };
