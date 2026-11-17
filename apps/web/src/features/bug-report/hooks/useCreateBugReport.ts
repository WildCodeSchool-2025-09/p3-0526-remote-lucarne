import type { BugReport, CreateBugReportInput } from "@lucarne/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { createBugReport } from "../../../services/bug-report.service";
import { bugReportKeys } from "../bugReportKeys";

function useCreateBugReport() {
  const queryClient = useQueryClient();

  return useMutation<BugReport, HttpError, CreateBugReportInput>({
    mutationFn: createBugReport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bugReportKeys.lists() });
    },
    retry: false,
  });
}

export { useCreateBugReport };
