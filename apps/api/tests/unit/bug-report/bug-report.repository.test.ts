import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BugReport } from "@lucarne/shared";
import { afterEach, describe, expect, it } from "vitest";
import { createBugReportRepository } from "../../../src/features/bug-report/bug-report.repository";

const temporaryDirectories: string[] = [];

async function createRepository() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "lucarne-bug-reports-"));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, "nested", "bug-reports.json");

  return { filePath, repository: createBugReportRepository(filePath) };
}

const firstBugReport: BugReport = {
  id: "00000000-0000-4000-8000-000000000001",
  createdAt: "2026-09-16T20:00:00.000Z",
  pagePath: "/dashboard/teams",
  title: "Bouton cassé",
  description: "Le bouton ne répond plus.",
};

describe("bug report repository", () => {
  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { force: true, recursive: true })));
  });

  it("creates the directory and file when listing an empty store", async () => {
    const { filePath, repository } = await createRepository();

    await expect(repository.listBugReports()).resolves.toEqual([]);
    await expect(fs.readFile(filePath, "utf8")).resolves.toBe("[]\n");
  });

  it("persists and deletes reports", async () => {
    const { filePath, repository } = await createRepository();

    await repository.saveBugReport(firstBugReport);
    expect(await repository.listBugReports()).toEqual([firstBugReport]);
    await expect(repository.deleteBugReport(firstBugReport.id)).resolves.toBe(true);
    await expect(repository.listBugReports()).resolves.toEqual([]);
    await expect(fs.readFile(filePath, "utf8")).resolves.toBe("[]\n");
  });

  it("returns false when deleting an unknown report", async () => {
    const { repository } = await createRepository();

    await expect(repository.deleteBugReport(firstBugReport.id)).resolves.toBe(false);
  });

  it("rejects invalid JSON without overwriting the file", async () => {
    const { filePath, repository } = await createRepository();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "invalid json", "utf8");

    await expect(repository.listBugReports()).rejects.toMatchObject({
      code: "BUG_REPORTS_STORAGE_ERROR",
      statusCode: 500,
    });
    await expect(fs.readFile(filePath, "utf8")).resolves.toBe("invalid json");
  });
});
