import { describe, expect, it } from "vitest";
import { leagueListQuerySchema } from "@lucarne/shared";

describe("leagueListQuerySchema", () => {
  it("applies the consultation defaults", () => {
    expect(leagueListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      status: "ALL",
      sortBy: "name",
      sortOrder: "asc",
    });
  });

  it("normalizes search and comma-separated countries", () => {
    expect(leagueListQuerySchema.parse({
      page: "2",
      pageSize: "20",
      search: "  france  ",
      countries: "France, Espagne,Italie",
      status: "ACTIVE",
      sortBy: "name",
      sortOrder: "desc",
    })).toEqual({
      page: 2,
      pageSize: 20,
      search: "france",
      countries: ["France", "Espagne", "Italie"],
      status: "ACTIVE",
      sortBy: "name",
      sortOrder: "desc",
    });
  });

  it("accepts creation date sorting in both directions", () => {
    expect(leagueListQuerySchema.parse({
      sortBy: "createdAt",
      sortOrder: "desc",
    })).toMatchObject({ sortBy: "createdAt", sortOrder: "desc" });
  });

  it("treats an empty search as absent", () => {
    expect(leagueListQuerySchema.parse({ search: "   " }).search).toBeUndefined();
  });

  it.each([
    { page: "0" },
    { pageSize: "10" },
    { status: "PENDING" },
    { sortBy: "country" },
    { sortOrder: "up" },
  ])("rejects invalid consultation parameters: %o", (query) => {
    expect(leagueListQuerySchema.safeParse(query).success).toBe(false);
  });
});
