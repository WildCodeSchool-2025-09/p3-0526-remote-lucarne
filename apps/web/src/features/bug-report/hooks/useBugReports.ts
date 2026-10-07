import { useQuery } from "@tanstack/react-query";
import { listBugReports } from "../../../services/bug-report.service";
import { bugReportKeys } from "../bugReportKeys";

function useBugReports() {
  return useQuery({
    queryFn: listBugReports,
    queryKey: bugReportKeys.lists(),
    retry: false,
  });
}

export { useBugReports };
