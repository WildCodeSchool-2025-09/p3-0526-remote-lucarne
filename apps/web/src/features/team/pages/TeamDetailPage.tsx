import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole, TEAM_EDIT_ROLES } from "../../../auth/authRole";
import { deleteTeam, updateTeam } from "../../../services/team.service";
import { AlertModal, Button } from "../../../ui";
import { useTeamDetail } from "../../../hooks/useTeamDetail";

type PendingAction = "activate" | "deactivate" | "delete";

export default function TeamDetailPage() {
  const { teamId = "" } = useParams();
  const query = useTeamDetail(teamId);
  const navigate = useNavigate();
  const role = getCurrentAppRole();
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const canEdit = hasRole(role, TEAM_EDIT_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;

  const confirmAction = async () => {
    if (!query.data || pendingAction == null) return;
    const action = pendingAction;
    setPendingAction(null);
    setIsActionPending(true);
    setActionError(false);
    try {
      if (action === "delete") {
        await deleteTeam(query.data.id);
        void navigate("/dashboard/teams");
        return;
      }
      await updateTeam(query.data.id, { isActive: action === "activate" });
      await query.refetch();
    } catch {
      setActionError(true);
    } finally {
      setIsActionPending(false);
    }
  };

  return <section className="league-detail-page" aria-labelledby="team-detail-title"><div className="league-detail-page__container"><Button onClick={() => void navigate(-1)} variant="ghost">← Retour à la liste</Button>{query.isPending ? <p role="status">Chargement de l’équipe…</p> : null}{query.isError ? <div className="league-list__state"><AlertModal onClose={() => void navigate(-1)}>Équipe introuvable.</AlertModal></div> : null}{query.data ? <article className="league-detail-card"><header><p className="league-list-page__eyebrow">Détail d’une équipe</p><h1 id="team-detail-title">{query.data.name}</h1></header><div className="league-detail-card__content">{query.data.logoUrl ? <img className="league-detail-card__logo" alt={`Logo de ${query.data.name}`} src={query.data.logoUrl} /> : <span className="league-detail-card__logo league-detail-card__logo--placeholder">{query.data.name.charAt(0).toUpperCase()}</span>}<dl><div><dt>Stade</dt><dd>{query.data.stadium ?? "Non renseigné"}</dd></div><div><dt>Statut</dt><dd>{query.data.isActive ? "Active" : "Inactive"}</dd></div><div><dt>Date de création</dt><dd>{new Date(query.data.createdAt).toLocaleDateString("fr-FR")}</dd></div></dl></div>{actionError ? <AlertModal variant="danger">Cette action est impossible pour le moment.</AlertModal> : null}<div className="league-detail-card__actions">{canEdit ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/teams/${query.data.id}/edit`}>Modifier</Link> : null}{canDelete ? <><Button disabled={isActionPending} onClick={() => setPendingAction(query.data.isActive ? "deactivate" : "activate")} variant="outline">{query.data.isActive ? "Désactiver" : "Activer"}</Button>{!query.data.isActive ? <Button disabled={isActionPending} onClick={() => setPendingAction("delete")} variant="danger">Supprimer</Button> : null}</> : null}</div></article> : null}</div>{pendingAction ? <div className="league-list__dialog-backdrop"><div aria-labelledby="team-detail-action-title" aria-modal="true" className="league-list__dialog" role="dialog"><h2 id="team-detail-action-title">{pendingAction === "deactivate" ? "Désactiver l’équipe ?" : pendingAction === "activate" ? "Activer l’équipe ?" : "Supprimer définitivement l’équipe ?"}</h2><p>{pendingAction === "deactivate" ? `${query.data?.name} deviendra inactive et restera consultable.` : pendingAction === "activate" ? `${query.data?.name} redeviendra active.` : `${query.data?.name} sera supprimée définitivement.`}</p><div className="league-list__dialog-actions"><Button onClick={() => setPendingAction(null)} variant="outline">Annuler</Button><Button disabled={isActionPending} onClick={() => void confirmAction()} variant={pendingAction === "delete" ? "danger" : "primary"}>{isActionPending ? "Traitement…" : "Confirmer"}</Button></div></div></div> : null}</section>;
}
