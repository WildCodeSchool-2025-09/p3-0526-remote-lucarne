import type { RequestHandler } from "express";
import type { BugReport, BugReportsResponse } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createBugReportService,
  deleteBugReportService,
  listBugReportsService,
} from "./bug-report.service";
import type { CreateBugReportInput } from "./bug-report.schema";

const listBugReports: RequestHandler<
  Record<string, never>,
  BugReportsResponse
> = asyncHandler(async (_request, response) => {
  response.json(await listBugReportsService());
});

const createBugReport: RequestHandler<
  Record<string, never>,
  BugReport,
  CreateBugReportInput
> = asyncHandler(async (request, response) => {
  response.status(201).json(await createBugReportService(request.body));
});

const deleteBugReport: RequestHandler<{ bugReportId: string }, void> = asyncHandler(async (request, response) => {
  await deleteBugReportService(request.params.bugReportId);
  response.sendStatus(204);
});

export { createBugReport, deleteBugReport, listBugReports };
