import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MAX_SEARCH_LENGTH,
  createSortQuerySchema,
  paginationQuerySchema,
} from "@lucarne/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("paginationQuerySchema", () => {
  it("applies defaults and coerces pagination query strings", () => {
    expect(paginationQuerySchema.parse({})).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
    });
    expect(paginationQuerySchema.parse({ page: "2", limit: "50" })).toEqual({
      page: 2,
      limit: 50,
    });
  });

  it("normalizes search and accepts camelCase sort with descending prefix", () => {
    expect(paginationQuerySchema.parse({
      search: "  Paris  ",
      sort: "-createdAt",
    })).toMatchObject({
      search: "Paris",
      sort: "-createdAt",
    });
  });

  it.each([
    { page: 0 },
    { limit: MAX_LIMIT + 1 },
    { search: "a".repeat(MAX_SEARCH_LENGTH + 1) },
    { sort: "created_at" },
    { sort: "+createdAt" },
  ])("rejects an invalid list query: %o", (query) => {
    expect(paginationQuerySchema.safeParse(query).success).toBe(false);
  });

  it("can be extended with feature-specific filters", () => {
    const leagueListQuerySchema = paginationQuerySchema.extend({
      country: z.string().trim().min(1).optional(),
      isActive: z.coerce.boolean().optional(),
    });

    expect(leagueListQuerySchema.parse({
      country: "  France ",
      isActive: "true",
    })).toMatchObject({
      country: "France",
      isActive: true,
    });
  });

  it("supports a feature-specific sort allowlist", () => {
    const dashboardSortSchema = createSortQuerySchema([
      "name",
      "createdAt",
    ]);

    expect(dashboardSortSchema.parse("name")).toBe("name");
    expect(dashboardSortSchema.parse("-createdAt")).toBe("-createdAt");
    expect(dashboardSortSchema.safeParse("country").success).toBe(false);
  });
});
