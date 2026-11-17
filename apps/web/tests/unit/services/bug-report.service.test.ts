import { afterEach, describe, expect, it, vi } from "vitest";
import type { BugReportsResponse } from "@lucarne/shared";
import { httpClient } from "../../../src/lib/httpClient";
import { createBugReport, deleteBugReport, listBugReports } from "../../../src/services/bug-report.service";

describe("bug report service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a bug report through the API", async () => {
    const input = {
      description: "Le bouton ne répond plus.",
      pagePath: "/dashboard/teams",
      title: "Bouton cassé",
    };
    const response = { ...input, createdAt: "2026-09-16T20:00:00.000Z", id: "bug-report-id" };
    const post = vi.spyOn(httpClient, "post").mockResolvedValue(response);

    await expect(createBugReport(input)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith("/bug-reports", { json: input });
  });

  it("lists bug reports", async () => {
    const response: BugReportsResponse = [];
    const get = vi.spyOn(httpClient, "get").mockResolvedValue(response);

    await expect(listBugReports()).resolves.toBe(response);
    expect(get).toHaveBeenCalledWith("/bug-reports");
  });

  it("deletes a bug report", async () => {
    const remove = vi.spyOn(httpClient, "delete").mockResolvedValue(undefined);

    await expect(deleteBugReport("bug-report-id")).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith("/bug-reports/bug-report-id");
  });
});
