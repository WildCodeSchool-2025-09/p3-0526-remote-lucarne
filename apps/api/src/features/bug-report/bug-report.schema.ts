import { bugReportIdParamsSchema, createBugReportInputSchema } from "@lucarne/shared";
import type { CreateBugReportInput } from "@lucarne/shared";

const createBugReportBodySchema = createBugReportInputSchema;

export { bugReportIdParamsSchema, createBugReportBodySchema };
export type { CreateBugReportInput };
