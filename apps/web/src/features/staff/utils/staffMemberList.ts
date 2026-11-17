import type { ListStaffMembersParams, StaffMemberStatusFilter } from "@lucarne/shared";

const PAGE_SIZE = 20 as const;
const STATUS_VALUES: StaffMemberStatusFilter[] = ["ALL", "ACTIVE", "INACTIVE"];
const SORT_FIELDS = ["lastName", "createdAt"] as const;
type StaffSortField = (typeof SORT_FIELDS)[number];

function parseParams(searchParams: URLSearchParams): ListStaffMembersParams {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawStatus = searchParams.get("status") ?? "ALL";
  const rawSortBy = searchParams.get("sortBy") ?? "lastName";

  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: PAGE_SIZE,
    search: searchParams.get("search") ?? undefined,
    teamName: searchParams.get("teamName") ?? undefined,
    status: STATUS_VALUES.includes(rawStatus as StaffMemberStatusFilter)
      ? (rawStatus as StaffMemberStatusFilter)
      : "ALL",
    sortBy: SORT_FIELDS.includes(rawSortBy as StaffSortField)
      ? (rawSortBy as StaffSortField)
      : "lastName",
    sortOrder: searchParams.get("sortOrder") === "desc" ? "desc" : "asc",
  };
}

function updateParams(
  current: URLSearchParams,
  changes: Partial<ListStaffMembersParams>,
): URLSearchParams {
  const next = new URLSearchParams(current);

  if ("search" in changes) {
    next.delete("search");
    if (changes.search?.trim()) next.set("search", changes.search.trim());
  }
  if ("teamName" in changes) {
    next.delete("teamName");
    if (changes.teamName?.trim()) next.set("teamName", changes.teamName.trim());
  }
  if ("status" in changes) {
    next.delete("status");
    if (changes.status != null && changes.status !== "ALL")
      next.set("status", changes.status);
  }
  if ("sortBy" in changes) {
    next.delete("sortBy");
    if (changes.sortBy != null && changes.sortBy !== "lastName")
      next.set("sortBy", changes.sortBy);
  }
  if ("sortOrder" in changes) {
    next.delete("sortOrder");
    if (changes.sortOrder === "desc") next.set("sortOrder", "desc");
  }
  if ("page" in changes) {
    next.delete("page");
    if (changes.page != null && changes.page > 1) next.set("page", String(changes.page));
  }

  return next;
}

export { PAGE_SIZE, parseParams, updateParams };
