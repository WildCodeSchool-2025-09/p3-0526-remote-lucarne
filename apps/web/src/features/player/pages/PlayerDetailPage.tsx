import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole } from "../../../auth/authRole";
import { useActivatePlayer, useDeactivatePlayer, useDeletePlayer, usePlayerDetail } from "../../../hooks/usePlayer";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, ConfirmDialog } from "../../../ui";
import { PlayerAssignments } from "../components/PlayerAssignments";

type PendingAction = "activate" | "deactivate" | "delete";
const playerEditRoles = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR] as const;

function errorMessage(error: unknown): string {
  if (error instanceof HttpError && error.status === 403) return "Accès refusé.";
  if (error instanceof HttpError && error.status === 404) return "Joueur introuvable.";
  return "Impossible de charger le joueur.";
}

export default function PlayerDetailPage() {
  const { playerId = "" } = useParams();
  const query = usePlayerDetail(playerId);
  const navigate = useNavigate();
  const activate = useActivatePlayer();
  const deactivate = useDeactivatePlayer();
  const remove = useDeletePlayer();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const role = getCurrentAppRole();
  const mutation = pendingAction === "activate" ? activate : pendingAction === "deactivate" ? deactivate : remove;
  const canEdit = hasRole(role, playerEditRoles);
  const canDelete = role === APP_ROLES.ADMIN;

  const confirmAction = async () => {
    if (query.data == null || pendingAction == null || mutation.isPending) return;
    const action = pendingAction;
    try {
      await mutation.mutateAsync(query.data.id);
      setPendingAction(null);
      if (action === "delete") void navigate("/dashboard/players");
    } catch { /* The dialog retains the mutation error. */ }
  };

  if (query.isPending) return <section className="league-detail-page"><p role="status">Chargement du joueur…</p></section>;
  if (query.isError) return <section className="league-detail-page"><Alert variant="danger">{errorMessage(query.error)}</Alert><Button onClick={() => void query.refetch()}>Réessayer</Button></section>;
  if (query.data == null) return <section className="league-detail-page"><Alert variant="danger">Joueur introuvable.</Alert></section>;

  const player = query.data;
  return <section className="league-detail-page" aria-labelledby="player-detail-title"><div className="league-detail-page__container"><Button onClick={() => void navigate(-1)} variant="ghost">← Retour</Button><article className="league-detail-card"><p className="league-list-page__eyebrow">Fiche joueur</p><h1 id="player-detail-title">{player.firstName} {player.lastName}</h1><dl><div><dt>Équipe</dt><dd>{player.activeTeam?.name ?? "Non renseignée"}</dd></div><div><dt>Poste</dt><dd>{player.position ?? "Non renseigné"}</dd></div><div><dt>Statut</dt><dd>{player.isActive ? "Actif" : "Inactif"}</dd></div><div><dt>Nationalité</dt><dd>{player.nationality ?? "Non renseignée"}</dd></div></dl><PlayerAssignments assignments={player.assignments} /><div className="league-detail-card__actions">{canEdit ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/players/${player.id}/edit`}>Modifier</Link> : null}{canEdit ? <Button disabled={mutation.isPending} onClick={() => setPendingAction(player.isActive ? "deactivate" : "activate")} variant="outline">{player.isActive ? "Désactiver" : "Activer"}</Button> : null}{canDelete ? <Button disabled={mutation.isPending} onClick={() => setPendingAction("delete")} variant="danger">Supprimer</Button> : null}</div></article></div><ConfirmDialog error={mutation.isError ? "Cette action est impossible pour le moment." : undefined} onCancel={() => { mutation.reset(); setPendingAction(null); }} onConfirm={() => void confirmAction()} open={pendingAction != null} pending={mutation.isPending} title="Confirmer l’action ?" variant={pendingAction === "delete" ? "danger" : "primary"} /></section>;
}
