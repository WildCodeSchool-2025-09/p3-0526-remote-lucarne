import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { createBugReport, deleteBugReport, listBugReports } from "./bug-report.controller";
import { bugReportIdParamsSchema, createBugReportBodySchema } from "./bug-report.schema";

const bugReportRouter = Router();

bugReportRouter.get("/", listBugReports);

bugReportRouter.post(
  "/",
  validateRequest({ body: createBugReportBodySchema }),
  createBugReport,
);

bugReportRouter.delete(
  "/:bugReportId",
  validateRequest({ params: bugReportIdParamsSchema }),
  deleteBugReport,
);

export default bugReportRouter;
