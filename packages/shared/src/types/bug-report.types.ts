interface BugReport {
  id: string;
  createdAt: string;
  pagePath: string;
  title: string;
  description: string;
}

interface CreateBugReportInput {
  pagePath: string;
  title: string;
  description: string;
}

type BugReportsResponse = BugReport[];

export type { BugReport, BugReportsResponse, CreateBugReportInput };
