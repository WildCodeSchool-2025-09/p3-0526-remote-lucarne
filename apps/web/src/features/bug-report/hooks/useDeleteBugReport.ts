import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HttpError } from "../../../lib/httpClient";
import { deleteBugReport } from "../../../services/bug-report.service";
import { bugReportKeys } from "../bugReportKeys";

function useDeleteBugReport() {
  const queryClient = useQueryClient();

  return useMutation<void, HttpError, string>({
    mutationFn: deleteBugReport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bugReportKeys.lists() });
    },
    retry: false,
  });
}

export { useDeleteBugReport };
