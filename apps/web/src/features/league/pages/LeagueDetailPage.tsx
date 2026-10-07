import { leagueStyles } from "../leagueStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  canDeleteLeague,
  canViewLeague,
  getCurrentAppRole,
} from "../../../auth/authRole";
import { AlertModal, Button, ConfirmDialog } from "../../../ui";
import { HttpError } from "../../../lib/httpClient";
import { formatDate } from "../../../lib/dateFormat";
import { useLeagueDetail } from "../hooks/useLeagueDetail";
import { useLeagueMutation } from "../hooks/useLeagueMutation";
import LeagueSeasons from "../components/LeagueSeasons";
import { getStatus } from "../utils/leagueList";

type PendingAction = "activate" | "deactivate" | "delete";

function isNotFoundError(error: unknown): boolean {
  return error instanceof HttpError
    ? error.status === 404
    : typeof error === "object" &&
        error != null &&
        "status" in error &&
        error.status === 404;
}

export default function LeagueDetailPage() {
  const navigate = useNavigate();
  const { leagueId = "" } = useParams();
  const query = useLeagueDetail(leagueId);
  const role = getCurrentAppRole();
  const mutation = useLeagueMutation();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const canEdit = canViewLeague(role);
  const canDelete = canDeleteLeague(role);

  const confirmAction = async () => {
    if (!query.data || pendingAction == null) return;

    const action = pendingAction;

    setPendingAction(null);

    try {
      await mutation.mutateAsync({ action, id: query.data.id });

      if (action === "delete") void navigate("/dashboard/leagues");
    } catch {
      /* mutation error is exposed below */
    }
  };

  const pageName = query.data?.name ?? "Ligue";
  const pageHeader = (
    <DashboardPageHeader
      resource="leagues"
      mode="detail"
      resourceId={leagueId}
      resourceName={pageName}
      headingId="league-detail-title"
      title={pageName}
    />
  );

  return (
    <section className={leagueStyles.detailPage} aria-labelledby="league-detail-title">
      <div className={leagueStyles.detailContainer}>
        {pageHeader}
        <Link className="lucarne-button lucarne-button--ghost" to="/dashboard/leagues">
          ← Retour à la liste
        </Link>
        {query.isPending ? <p role="status">Chargement de la ligue…</p> : null}
        {query.isError ? (
          <div className="grid items-center justify-items-center gap-4 px-4 py-12 text-center">
            <AlertModal onClose={() => void navigate("/dashboard/leagues")}>
              {isNotFoundError(query.error)
                ? "Cette ligue n’existe plus ou a déjà été supprimée."
                : "Impossible de charger cette ligue."}
            </AlertModal>
          </div>
        ) : null}
        {query.data ? (
          <>
            <article className={leagueStyles.detailCard}>
              <div className="flex items-start gap-8 league-mobile:flex-col league-mobile:items-center">
                {query.data.logoUrl ? (
                  <img
                    alt={`Logo de ${query.data.name}`}
                    className="size-11 rounded-lg object-contain"
                    src={query.data.logoUrl}
                  />
                ) : (
                  <span
                    aria-label={`Initiale de ${query.data.name}`}
                    className={`
                      inline-flex size-11 items-center justify-center rounded-lg
                      bg-[var(--color-bg-subtle)] text-[18px] font-extrabold
                      text-[var(--color-text-secondary)]
                    `}
                  >
                    {query.data.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <dl>
                  <div>
                    <dt>Pays</dt>
                    <dd>{query.data.country}</dd>
                  </div>
                  <div>
                    <dt>Statut</dt>
                    <dd>{getStatus(query.data) === "ACTIVE" ? "Active" : "Inactive"}</dd>
                  </div>
                  <div>
                    <dt>Date de création</dt>
                    <dd>{formatDate(query.data.createdAt)}</dd>
                  </div>
                </dl>
              </div>
              {mutation.isError ? (
                <AlertModal variant="danger">
                  Cette action est impossible pour le moment.
                </AlertModal>
              ) : null}
              <div>
                {canEdit ? (
                  <Link
                    className="lucarne-button lucarne-button--outline"
                    to={`/dashboard/leagues/${query.data.id}/edit`}
                  >
                    Modifier
                  </Link>
                ) : null}
                {canEdit ? (
                  <Button
                    disabled={mutation.isPending}
                    onClick={() =>
                      setPendingAction(query.data.isActive ? "deactivate" : "activate")
                    }
                    variant="outline"
                  >
                    {query.data.isActive ? "Désactiver" : "Activer"}
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    disabled={mutation.isPending}
                    onClick={() => setPendingAction("delete")}
                    variant="danger"
                  >
                    Supprimer définitivement
                  </Button>
                ) : null}
              </div>
            </article>
            <LeagueSeasons leagueId={query.data.id} />
          </>
        ) : null}
      </div>
      {pendingAction ? (
        <ConfirmDialog
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void confirmAction()}
          open
          pending={mutation.isPending}
          title={
            pendingAction === "deactivate"
              ? "Désactiver la ligue ?"
              : pendingAction === "activate"
                ? "Activer la ligue ?"
                : "Supprimer définitivement la ligue ?"
          }
          variant={pendingAction === "delete" ? "danger" : "primary"}
        >
          {pendingAction === "deactivate"
            ? `${query.data?.name} deviendra inactive et restera consultable.`
            : pendingAction === "activate"
              ? `${query.data?.name} redeviendra active.`
              : `${query.data?.name} sera supprimée définitivement. Cette action est irréversible et sera refusée si des saisons associées existent.`}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
