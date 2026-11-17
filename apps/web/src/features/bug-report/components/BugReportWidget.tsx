import type { CreateBugReportInput } from "@lucarne/shared";
import { useState } from "react";
import { Bug } from "lucide-react";
import { useCreateBugReport } from "../hooks/useCreateBugReport";
import { BugReportDialog } from "./BugReportDialog";

interface BugReportWidgetProps {
  onSubmit?: (input: CreateBugReportInput) => void | Promise<void>;
}

function BugReportWidget({ onSubmit }: BugReportWidgetProps) {
  const [error, setError] = useState<string>();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const createBugReportMutation = useCreateBugReport();

  const handleOpen = () => {
    setError(undefined);
    createBugReportMutation.reset();
    setIsOpen(true);
  };

  const handleCancel = () => {
    if (!isPending) setIsOpen(false);
  };

  const handleSubmit = async (input: CreateBugReportInput) => {
    setError(undefined);

    setIsPending(true);

    try {
      if (onSubmit == null) {
        await createBugReportMutation.mutateAsync(input);
      } else {
        await onSubmit(input);
      }
      setIsOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible d’enregistrer le bug report.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        aria-label="Signaler un bug"
        className="bug-report-widget"
        onClick={handleOpen}
        type="button"
      >
        <Bug aria-hidden="true" size={22} strokeWidth={2.25} />
      </button>
      <BugReportDialog
        error={error ?? createBugReportMutation.error?.message}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        open={isOpen}
        pending={isPending || createBugReportMutation.isPending}
      />
    </>
  );
}

export { BugReportWidget };
export type { BugReportWidgetProps };
