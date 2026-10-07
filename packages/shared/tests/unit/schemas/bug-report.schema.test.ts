import { describe, expect, it } from "vitest";
import {
  bugReportIdParamsSchema,
  createBugReportInputSchema,
} from "../../../src/schemas/bug-report.schema";

describe("bug report schemas", () => {
  it("accepts a valid creation payload and trims text fields", () => {
    const result = createBugReportInputSchema.parse({
      pagePath: " /dashboard/teams ",
      title: "  Bouton cassé  ",
      description: "  Le bouton ne répond plus.  ",
    });

    expect(result).toEqual({
      pagePath: "/dashboard/teams",
      title: "Bouton cassé",
      description: "Le bouton ne répond plus.",
    });
  });

  it("rejects missing or blank required fields", () => {
    const result = createBugReportInputSchema.safeParse({
      pagePath: " ",
      title: "",
      description: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized fields", () => {
    const result = createBugReportInputSchema.safeParse({
      pagePath: "/bug",
      title: "a".repeat(201),
      description: "a".repeat(5_001),
    });

    expect(result.success).toBe(false);
  });

  it("validates the deletion identifier", () => {
    expect(bugReportIdParamsSchema.safeParse({
      bugReportId: "00000000-0000-0000-0000-000000000000",
    }).success).toBe(true);
    expect(bugReportIdParamsSchema.safeParse({ bugReportId: "not-a-uuid" }).success).toBe(false);
  });
});
