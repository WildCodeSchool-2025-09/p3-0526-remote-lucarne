import type { BugReport } from "@lucarne/shared";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, Button, ConfirmDialog, EmptyState, LoadingState } from "../../../ui";
import { formatDateTime } from "../../../lib/dateTimeFormat";
import { useDeleteBugReport } from "../hooks/useDeleteBugReport";
import { useBugReports } from "../hooks/useBugReports";

function BugReportPage() {
  const query = useBugReports();
  const deleteMutation = useDeleteBugReport();
  const [feedback, setFeedback] = useState<string>();
  const [pendingBugReport, setPendingBugReport] = useState<BugReport>();

  const confirmDeletion = async () => {
    if (pendingBugReport == null) return;

    try {
      await deleteMutation.mutateAsync(pendingBugReport.id);
      setPendingBugReport(undefined);
      setFeedback("Le bug report a été supprimé.");
    } catch {
      setFeedback("Impossible de supprimer le bug report. Veuillez réessayer.");
    }
  };

  return (
    <section aria-labelledby="bug-report-page-title" className="bug-reports-page">
      <div className="bug-reports-page__container">
        <header className="bug-reports-page__header">
          <p className="bug-reports-page__eyebrow">Développement uniquement</p>
          <h1 id="bug-report-page-title">Bug reports</h1>
          <p>Consultez les problèmes signalés depuis l’application.</p>
        </header>

        {feedback ? <Alert variant={feedback.startsWith("Impossible") ? "danger" : "success"}>{feedback}</Alert> : null}
        {query.isPending ? <LoadingState>Chargement des bug reports…</LoadingState> : null}

        {query.isError ? (
          <div className="dashboard-list__state">
            <Alert>Impossible de charger les bug reports. Veuillez réessayer.</Alert>
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </div>
        ) : null}

        {query.isSuccess && query.data.length === 0 ? (
          <EmptyState>Aucun bug report n’est disponible.</EmptyState>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <div className="dashboard-list__table-wrapper bug-reports-table-wrapper">
            <table className="dashboard-list__table bug-reports-table">
              <caption className="sr-only">Liste des bug reports</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Page</th>
                  <th scope="col">Titre</th>
                  <th scope="col">Description</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((bugReport) => (
                  <tr key={bugReport.id}>
                    <td data-label="Date">{formatDateTime(bugReport.createdAt)}</td>
                    <td data-label="Page"><code>{bugReport.pagePath}</code></td>
                    <td data-label="Titre">{bugReport.title}</td>
                    <td className="bug-reports-table__description" data-label="Description">{bugReport.description}</td>
                    <td data-label="Actions">
                      <Button
                        aria-label={`Supprimer le bug report « ${bugReport.title} »`}
                        disabled={deleteMutation.isPending}
                        onClick={() => { deleteMutation.reset(); setFeedback(undefined); setPendingBugReport(bugReport); }}
                        size="sm"
                        variant="danger"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        actionLabel="Supprimer définitivement"
        error={deleteMutation.isError ? "Impossible de supprimer le bug report. Veuillez réessayer." : undefined}
        onCancel={() => { deleteMutation.reset(); setPendingBugReport(undefined); }}
        onConfirm={() => void confirmDeletion()}
        open={pendingBugReport != null}
        pending={deleteMutation.isPending}
        title="Supprimer ce bug report ?"
        variant="danger"
      >
        Cette suppression est définitive.
      </ConfirmDialog>
    </section>
  );
}

export default BugReportPage;
