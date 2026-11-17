import { randomUUID } from "node:crypto";
import type { BugReport, CreateBugReportInput } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { deleteBugReport, listBugReports, saveBugReport } from "./bug-report.repository";

const listBugReportsService = (): Promise<BugReport[]> => listBugReports();

const createBugReportService = async (input: CreateBugReportInput): Promise<BugReport> => {
  const bugReport: BugReport = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    pagePath: input.pagePath,
    title: input.title,
    description: input.description,
  };

  return saveBugReport(bugReport);
};

const deleteBugReportService = async (id: string): Promise<void> => {
  const deleted = await deleteBugReport(id);

  if (!deleted) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "Bug report not found");
  }
};

export { createBugReportService, deleteBugReportService, listBugReportsService };
