import type { BugReport, BugReportsResponse, CreateBugReportInput } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function listBugReports(): Promise<BugReportsResponse> {
  return httpClient.get<BugReportsResponse>("/bug-reports");
}

async function createBugReport(input: CreateBugReportInput): Promise<BugReport> {
  const { description, pagePath, title } = input;

  return httpClient.post<BugReport>("/bug-reports", {
    json: { description, pagePath, title },
  });
}

async function deleteBugReport(id: string): Promise<void> {
  await httpClient.delete<void>(`/bug-reports/${id}`);
}

export { createBugReport, deleteBugReport, listBugReports };
