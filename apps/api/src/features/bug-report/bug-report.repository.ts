import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { BugReport } from "@lucarne/shared";
import { environment } from "../../config/environment";
import { AppError } from "../../errors/AppError";

const storedBugReportSchema = z.object({
  id: z.uuid(),
  createdAt: z.string(),
  pagePath: z.string(),
  title: z.string(),
  description: z.string(),
}).strict();

const storedBugReportsSchema = z.array(storedBugReportSchema);

const storageError = (): AppError => new AppError(
  500,
  "BUG_REPORTS_STORAGE_ERROR",
  "Bug reports storage is unavailable",
);

const isNodeError = (error: unknown, code: string): boolean =>
  typeof error === "object"
  && error != null
  && "code" in error
  && error.code === code;

interface BugReportRepository {
  deleteBugReport: (id: string) => Promise<boolean>;
  listBugReports: () => Promise<BugReport[]>;
  saveBugReport: (bugReport: BugReport) => Promise<BugReport>;
}

function createBugReportRepository(filePath: string = environment.bugReports.filePath): BugReportRepository {
  let operationQueue = Promise.resolve();

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = operationQueue.then(operation);

    operationQueue = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  };

  const ensureStorage = async (): Promise<void> => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    try {
      await fs.access(filePath);
    } catch (error) {
      if (!isNodeError(error, "ENOENT")) {
        throw storageError();
      }

      await fs.writeFile(filePath, "[]\n", {
        encoding: "utf8",
        flag: "wx",
      }).catch((writeError: unknown) => {
        if (!isNodeError(writeError, "EEXIST")) {
          throw storageError();
        }
      });
    }
  };

  const readBugReports = async (): Promise<BugReport[]> => {
    await ensureStorage();

    let content: string;

    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      throw storageError();
    }

    let parsedContent: unknown;

    try {
      parsedContent = JSON.parse(content) as unknown;
    } catch {
      throw storageError();
    }

    const result = storedBugReportsSchema.safeParse(parsedContent);

    if (!result.success) {
      throw storageError();
    }

    return result.data;
  };

  const writeBugReports = async (bugReports: BugReport[]): Promise<void> => {
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;

    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(bugReports, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });

      try {
        await fs.rename(temporaryPath, filePath);
      } catch (error) {
        if (!isNodeError(error, "EEXIST") && !isNodeError(error, "EPERM")) {
          throw error;
        }

        await fs.rm(filePath, { force: true });
        await fs.rename(temporaryPath, filePath);
      }
    } catch {
      throw storageError();
    } finally {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  };

  const listBugReports = (): Promise<BugReport[]> => enqueue(readBugReports);

  const saveBugReport = (bugReport: BugReport): Promise<BugReport> => enqueue(async () => {
    const bugReports = await readBugReports();

    bugReports.push(bugReport);
    await writeBugReports(bugReports);

    return bugReport;
  });

  const deleteBugReport = (id: string): Promise<boolean> => enqueue(async () => {
    const bugReports = await readBugReports();
    const remainingBugReports = bugReports.filter((bugReport) => bugReport.id !== id);

    if (remainingBugReports.length === bugReports.length) {
      return false;
    }

    await writeBugReports(remainingBugReports);

    return true;
  });

  return { deleteBugReport, listBugReports, saveBugReport };
}

const defaultBugReportRepository = createBugReportRepository();
const { deleteBugReport, listBugReports, saveBugReport } = defaultBugReportRepository;

export { createBugReportRepository, deleteBugReport, listBugReports, saveBugReport };
export type { BugReportRepository };
