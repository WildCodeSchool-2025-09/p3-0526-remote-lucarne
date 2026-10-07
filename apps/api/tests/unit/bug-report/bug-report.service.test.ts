import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteBugReport,
  listBugReports,
  saveBugReport,
} from "../../../src/features/bug-report/bug-report.repository";
import {
  createBugReportService,
  deleteBugReportService,
  listBugReportsService,
} from "../../../src/features/bug-report/bug-report.service";

vi.mock("../../../src/features/bug-report/bug-report.repository", () => ({
  deleteBugReport: vi.fn(),
  listBugReports: vi.fn(),
  saveBugReport: vi.fn(),
}));

const deleteStoredBugReport = vi.mocked(deleteBugReport);
const listStoredBugReports = vi.mocked(listBugReports);
const saveStoredBugReport = vi.mocked(saveBugReport);

describe("bug report service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a server-owned identifier and timestamp", async () => {
    const savedBugReport = {
      id: "bug-report-id",
      createdAt: "2026-09-16T20:00:00.000Z",
      pagePath: "/dashboard/teams",
      title: "Bouton cassé",
      description: "Le bouton ne répond plus.",
    };
    saveStoredBugReport.mockImplementation((bugReport) => Promise.resolve(bugReport));

    const result = await createBugReportService({
      pagePath: savedBugReport.pagePath,
      title: savedBugReport.title,
      description: savedBugReport.description,
    });

    expect(result).toMatchObject({
      pagePath: savedBugReport.pagePath,
      title: savedBugReport.title,
      description: savedBugReport.description,
    });
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(result.createdAt))).toBe(false);
    expect(saveStoredBugReport).toHaveBeenCalledWith(result);
  });

  it("lists stored bug reports", async () => {
    const bugReports = [{
      id: "bug-report-id",
      createdAt: "2026-09-16T20:00:00.000Z",
      pagePath: "/bug",
      title: "Titre",
      description: "Description",
    }];
    listStoredBugReports.mockResolvedValue(bugReports);

    await expect(listBugReportsService()).resolves.toBe(bugReports);
  });

  it("raises not found when deletion does not remove a report", async () => {
    deleteStoredBugReport.mockResolvedValue(false);

    await expect(deleteBugReportService("missing-id")).rejects.toMatchObject({
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
    });
  });

  it("completes deletion when the repository removes a report", async () => {
    deleteStoredBugReport.mockResolvedValue(true);

    await expect(deleteBugReportService("bug-report-id")).resolves.toBeUndefined();
  });
});
