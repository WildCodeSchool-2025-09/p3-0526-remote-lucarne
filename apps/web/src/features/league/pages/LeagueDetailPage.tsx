import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { canDeleteLeague, canViewLeague, getCurrentAppRole } from "../../../auth/authRole";
import { AlertModal, Button } from "../../../ui";
import { HttpError } from "../../../lib/httpClient";
import { useLeagueDetail } from "../hooks/useLeagueDetail";
import { useLeagueMutation } from "../hooks/useLeagueMutation";
import { formatDate, getStatus } from "../utils/leagueList";

type PendingAction = "activate" | "deactivate" | "delete";

function isNotFoundError(error: unknown): boolean {
  return error instanceof HttpError ? error.status === 404 : typeof error === "object" && error != null && "status" in error && error.status === 404;
}

export default function LeagueDetailPage() {
  const navigate = useNavigate();
  const { leagueId = "" } = useParams();
  const query = useLeagueDetail(leagueId);
  const role = getCurrentAppRole();
  const mutation = useLeagueMutation();
  const isActionPending = mutation.isPending;
  const actionError = mutation.isError;
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const canEdit = canViewLeague(role);
  const canDelete = canDeleteLeague(role);

  const confirmAction = async () => {
    if (!query.data || pendingAction == null) return;
    const action = pendingAction;
    setPendingAction(null);
    try {
      await mutation.mutateAsync({ action, id: query.data.id });
      if (action === "delete") {
        void navigate("/dashboard/leagues");
      }
    } catch { /* mutation error is exposed to the UI below */ }
  };

  return <section className="league-detail-page" aria-labelledby="league-detail-title"><div className="league-detail-page__container"><Button onClick={() => void navigate(-1)} variant="ghost">← Retour à la liste</Button>{query.isPending ? <p role="status">Chargement de la ligue…</p> : null}{query.isError ? <div className="league-list__state"><AlertModal onClose={() => void navigate(-1)}>{isNotFoundError(query.error) ? "Cette ligue n’existe plus ou a déjà été supprimée." : "Impossible de charger cette ligue."}</AlertModal></div> : null}{query.data ? <article className="league-detail-card"><header><p className="league-list-page__eyebrow">Détail d’une ligue</p><h1 id="league-detail-title">{query.data.name}</h1></header><div className="league-detail-card__content">{query.data.logoUrl ? <img alt={`Logo de ${query.data.name}`} className="league-detail-card__logo" src={query.data.logoUrl} /> : <span aria-label={`Initiale de ${query.data.name}`} className="league-detail-card__logo league-detail-card__logo--placeholder">{query.data.name.charAt(0).toUpperCase()}</span>}<dl><div><dt>Pays</dt><dd>{query.data.country}</dd></div><div><dt>Statut</dt><dd>{getStatus(query.data) === "ACTIVE" ? "Active" : "Inactive"}</dd></div><div><dt>Date de création</dt><dd>{formatDate(query.data.createdAt)}</dd></div></dl></div>{actionError ? <AlertModal variant="danger">Cette action est impossible pour le moment.</AlertModal> : null}<div className="league-detail-card__actions">{canEdit ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/leagues/${query.data.id}/edit`}>Modifier</Link> : null}{canEdit ? <Button disabled={isActionPending} onClick={() => setPendingAction(query.data.isActive ? "deactivate" : "activate")} variant="outline">{query.data.isActive ? "Désactiver" : "Activer"}</Button> : null}{canDelete ? <Button disabled={isActionPending} onClick={() => setPendingAction("delete")} variant="danger">Supprimer définitivement</Button> : null}</div></article> : null}</div>{pendingAction ? <div className="league-list__dialog-backdrop"><div aria-labelledby="league-detail-action-title" aria-modal="true" className="league-list__dialog" role="dialog"><h2 id="league-detail-action-title">{pendingAction === "deactivate" ? "Désactiver la ligue ?" : pendingAction === "activate" ? "Activer la ligue ?" : "Supprimer définitivement la ligue ?"}</h2><p>{pendingAction === "deactivate" ? `${query.data?.name} deviendra inactive et restera consultable.` : pendingAction === "activate" ? `${query.data?.name} redeviendra active.` : `${query.data?.name} sera supprimée définitivement. Cette action est irréversible et sera refusée si des saisons associées existent.`}</p><div className="league-list__dialog-actions"><Button onClick={() => setPendingAction(null)} variant="outline">Annuler</Button><Button disabled={isActionPending} onClick={() => void confirmAction()} variant={pendingAction === "delete" ? "danger" : "primary"}>{isActionPending ? "Traitement…" : "Confirmer"}</Button></div></div></div> : null}</section>;
}
