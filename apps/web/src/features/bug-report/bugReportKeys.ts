const bugReportKeys = {
  all: ["bug-report"] as const,
  lists: () => [...bugReportKeys.all, "list"] as const,
};

export { bugReportKeys };
