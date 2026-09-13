import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole } from "../../../auth/authRole";
import { activatePlayer, deactivatePlayer, deletePlayer } from "../../../services/player.service";
import { AlertModal, Button } from "../../../ui";
import { usePlayerDetail } from "../../../hooks/usePlayer";

type PendingAction = "activate" | "deactivate" | "delete";
const PLAYER_EDIT_ROLES = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR] as const;

export default function PlayerDetailPage() {
  const { playerId = "" } = useParams();
  const query = usePlayerDetail(playerId);
  const navigate = useNavigate();
  const role = getCurrentAppRole();
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const canEdit = hasRole(role, PLAYER_EDIT_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;

  const confirmAction = async () => {
    if (!query.data || pendingAction == null) return;
    const action = pendingAction;
    setPendingAction(null);
    setIsActionPending(true);
    setActionError(false);
    try {
      if (action === "deactivate") await deactivatePlayer(query.data.id);
      else if (action === "activate") await activatePlayer(query.data.id);
      else {
        await deletePlayer(query.data.id);
        void navigate("/dashboard/players");
        return;
      }
      await query.refetch();
    } catch {
      setActionError(true);
    } finally {
      setIsActionPending(false);
    }
  };

  return <section className="league-detail-page" aria-labelledby="player-detail-title"><div className="league-detail-page__container"><Button onClick={() => void navigate(-1)} variant="ghost">← Retour</Button>{query.isPending ? <p role="status">Chargement du joueur…</p> : null}{query.isError || !query.data ? <AlertModal onClose={() => void navigate(-1)}>Joueur introuvable.</AlertModal> : null}{query.data ? <article className="league-detail-card"><p className="league-list-page__eyebrow">Fiche joueur</p><h1 id="player-detail-title">{query.data.firstName} {query.data.lastName}</h1><dl><div><dt>Équipe</dt><dd>{query.data.activeTeam?.name ?? "Non renseignée"}</dd></div><div><dt>Poste</dt><dd>{query.data.position ?? "Non renseigné"}</dd></div><div><dt>Statut</dt><dd>{query.data.isActive ? "Actif" : "Inactif"}</dd></div><div><dt>Nationalité</dt><dd>{query.data.nationality ?? "Non renseignée"}</dd></div></dl>{actionError ? <AlertModal variant="danger">Cette action est impossible pour le moment.</AlertModal> : null}<div className="league-detail-card__actions">{canEdit ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/players/${query.data.id}/edit`}>Modifier</Link> : null}{canEdit ? <Button disabled={isActionPending} onClick={() => setPendingAction(query.data.isActive ? "deactivate" : "activate")} variant="outline">{query.data.isActive ? "Désactiver" : "Activer"}</Button> : null}{canDelete && !query.data.isActive ? <Button disabled={isActionPending} onClick={() => setPendingAction("delete")} variant="danger">Supprimer</Button> : null}</div></article> : null}</div>{pendingAction ? <div className="league-list__dialog-backdrop"><div aria-labelledby="player-detail-action-title" aria-modal="true" className="league-list__dialog" role="dialog"><h2 id="player-detail-action-title">{pendingAction === "deactivate" ? "Désactiver le joueur ?" : pendingAction === "activate" ? "Activer le joueur ?" : "Supprimer définitivement le joueur ?"}</h2><p>{pendingAction === "deactivate" ? `${query.data?.firstName} ${query.data?.lastName} deviendra inactif et restera consultable.` : pendingAction === "activate" ? `${query.data?.firstName} ${query.data?.lastName} redeviendra actif.` : `${query.data?.firstName} ${query.data?.lastName} sera supprimé définitivement.`}</p><div className="league-list__dialog-actions"><Button onClick={() => setPendingAction(null)} variant="outline">Annuler</Button><Button disabled={isActionPending} onClick={() => void confirmAction()} variant={pendingAction === "delete" ? "danger" : "primary"}>{isActionPending ? "Traitement…" : "Confirmer"}</Button></div></div></div> : null}</section>;
}
