import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole, TEAM_EDIT_ROLES } from "../../../auth/authRole";
import { useTeamDetail } from "../../../hooks/useTeamDetail";
import { Alert, Button, ConfirmDialog } from "../../../ui";
import { useTeamMutation } from "../hooks/useTeamMutation";

type PendingAction = "activate" | "deactivate" | "delete";

export default function TeamDetailPage() {
  const { teamId = "" } = useParams();
  const query = useTeamDetail(teamId);
  const navigate = useNavigate();
  const mutation = useTeamMutation();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const role = getCurrentAppRole();
  const canEdit = hasRole(role, TEAM_EDIT_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;

  const confirmAction = async () => {
    if (query.data == null || pendingAction == null || mutation.isPending) return;
    const action = pendingAction;
    try {
      await mutation.mutateAsync({ action, id: query.data.id });
      setPendingAction(null);
      if (action === "delete") void navigate("/dashboard/teams");
    } catch { /* The dialog retains the mutation error. */ }
  };

  if (query.isPending) return <section className="league-detail-page"><p role="status">Chargement de l’équipe…</p></section>;
  if (query.isError) return <section className="league-detail-page"><Alert variant="danger">Impossible de charger l’équipe.</Alert><Button onClick={() => void query.refetch()}>Réessayer</Button></section>;
  if (query.data == null) return <section className="league-detail-page"><Alert variant="danger">Équipe introuvable.</Alert></section>;

  const team = query.data;
  return <section className="league-detail-page" aria-labelledby="team-detail-title"><div className="league-detail-page__container"><Button onClick={() => void navigate(-1)} variant="ghost">← Retour à la liste</Button><article className="league-detail-card"><header><p className="league-list-page__eyebrow">Détail d’une équipe</p><h1 id="team-detail-title">{team.name}</h1></header><div className="league-detail-card__content"><dl><div><dt>Stade</dt><dd>{team.stadium ?? "Non renseigné"}</dd></div><div><dt>Statut</dt><dd>{team.isActive ? "Active" : "Inactive"}</dd></div></dl></div><div className="league-detail-card__actions">{canEdit ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/teams/${team.id}/edit`}>Modifier</Link> : null}{canEdit ? <Button disabled={mutation.isPending} onClick={() => setPendingAction(team.isActive ? "deactivate" : "activate")} variant="outline">{team.isActive ? "Désactiver" : "Activer"}</Button> : null}{canDelete ? <Button disabled={mutation.isPending} onClick={() => setPendingAction("delete")} variant="danger">Supprimer</Button> : null}</div></article></div><ConfirmDialog error={mutation.isError ? "Cette action est impossible pour le moment." : undefined} onCancel={() => { mutation.reset(); setPendingAction(null); }} onConfirm={() => void confirmAction()} open={pendingAction != null} pending={mutation.isPending} title="Confirmer l’action ?" variant={pendingAction === "delete" ? "danger" : "primary"} /></section>;
}
