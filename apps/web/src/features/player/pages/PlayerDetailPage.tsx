import { playerStyles } from "../playerStyles";
import { PlayerActionDialog } from "../components/PlayerActionDialog";
import type { PlayerActionType } from "../components/PlayerRowActions";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  APP_ROLES,
  getCurrentAppRole,
  hasRole,
  PLAYER_WRITE_ROLES,
} from "../../../auth/authRole";
import {
  useActivatePlayer,
  useDeactivatePlayer,
  useDeletePlayer,
  usePlayerDetail,
} from "../../../hooks/usePlayer";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button } from "../../../ui";
import { PlayerPhoto } from "../components/PlayerPhoto";
import { PlayerAssignments } from "../components/PlayerAssignments";
import { CreatePlayerAssignmentForm } from "../components/CreatePlayerAssignmentForm";

function playerDetailErrorMessage(error: unknown): string {
  if (error instanceof HttpError && error.status === 403) return "Accès refusé.";
  if (error instanceof HttpError && error.status === 404) return "Joueuse introuvable.";

  return "Impossible de charger la joueuse.";
}

export default function PlayerDetailPage() {
  const { playerId = "" } = useParams();
  const query = usePlayerDetail(playerId);
  const navigate = useNavigate();
  const activate = useActivatePlayer();
  const deactivate = useDeactivatePlayer();
  const remove = useDeletePlayer();
  const [pendingAction, setPendingAction] = useState<PlayerActionType | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const role = getCurrentAppRole();
  const mutation =
    pendingAction === "activate"
      ? activate
      : pendingAction === "deactivate"
        ? deactivate
        : remove;
  const canEdit = hasRole(role, PLAYER_WRITE_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;

  const confirmAction = async () => {
    if (query.data == null || pendingAction == null || mutation.isPending) return;

    const action = pendingAction;

    try {
      await mutation.mutateAsync(query.data.id);
      setPendingAction(null);

      if (action === "delete") void navigate("/dashboard/players");
    } catch {
      /* The dialog retains the mutation error. */
    }
  };

  const player = query.data;
  const pageName = player ? `${player.firstName} ${player.lastName}` : "Joueuse";

  return (
    <section className={playerStyles.detailPage} aria-labelledby="player-detail-title">
      <div className={playerStyles.container}>
        <DashboardPageHeader
          resource="players"
          mode="detail"
          resourceId={playerId}
          resourceName={pageName}
          headingId="player-detail-title"
          title={pageName}
        />
        {query.isPending ? <p role="status">Chargement de la joueuse…</p> : null}
        {query.isError ? (
          <>
            <Alert variant="danger">{playerDetailErrorMessage(query.error)}</Alert>
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </>
        ) : null}
        {!query.isPending && !query.isError && !player ? (
          <Alert variant="danger">Joueuse introuvable.</Alert>
        ) : null}
        {query.isPending || query.isError || !player ? (
          <Link to="/dashboard/players">Retour à la liste</Link>
        ) : (
          <>
            <Button
              className="justify-self-start"
              onClick={() => void navigate("/dashboard/players")}
              variant="ghost"
            >
              ← Retour à la liste
            </Button>
            <article className={playerStyles.detailCard}>
              <div className="flex items-start gap-8 player-mobile:flex-col player-mobile:items-center">
                <PlayerPhoto
                  key={`${player.id}:${player.pictureUrl ?? ""}`}
                  pictureUrl={player.pictureUrl}
                  name={pageName}
                />
                <dl
                  className={`
                  m-0 grid gap-4 [&>div]:grid [&>div]:gap-1 [&_dt]:text-[13px] [&_dt]:font-bold
                  [&_dt]:text-[var(--color-text-secondary)] [&_dt]:uppercase [&_dd]:m-0
                `}
                >
                  <div>
                    <dt>Équipe</dt>
                    <dd>{player.activeTeam?.name ?? "Non renseignée"}</dd>
                  </div>
                  <div>
                    <dt>Poste</dt>
                    <dd>{player.position ?? "Non renseigné"}</dd>
                  </div>
                  <div>
                    <dt>Statut</dt>
                    <dd>{player.isActive ? "Active" : "Inactive"}</dd>
                  </div>
                  <div>
                    <dt>Nationalité</dt>
                    <dd>{player.nationality ?? "Non renseignée"}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex gap-2">
                {canEdit ? (
                  <>
                    <Link
                      className="lucarne-button lucarne-button--outline"
                      to={`/dashboard/players/${player.id}/edit`}
                    >
                      Modifier
                    </Link>
                    <Button
                      disabled={mutation.isPending}
                      onClick={() =>
                        setPendingAction(player.isActive ? "deactivate" : "activate")
                      }
                      variant="outline"
                    >
                      {player.isActive ? "Désactiver" : "Activer"}
                    </Button>
                  </>
                ) : null}
                {canDelete ? (
                  <Button
                    disabled={mutation.isPending}
                    onClick={() => setPendingAction("delete")}
                    variant="danger"
                  >
                    Supprimer
                  </Button>
                ) : null}
              </div>
            </article>
            <PlayerAssignments
              assignments={player.assignments}
              playerId={player.id}
              canEdit={canEdit}
            >
              {canEdit && !isScheduling ? (
                <Button onClick={() => setIsScheduling(true)} variant="outline">
                  Ajouter une affectation
                </Button>
              ) : null}
              {canEdit && isScheduling ? (
                <CreatePlayerAssignmentForm
                  onCancel={() => setIsScheduling(false)}
                  onSuccess={() => setIsScheduling(false)}
                  playerId={player.id}
                />
              ) : null}
            </PlayerAssignments>
          </>
        )}
      </div>
      {!query.isPending && !query.isError && player ? (
        <PlayerActionDialog
          action={pendingAction}
          error={mutation.isError ? mutation.error : undefined}
          onCancel={() => {
            mutation.reset();
            setPendingAction(null);
          }}
          onConfirm={() => void confirmAction()}
          pending={mutation.isPending}
        />
      ) : null}
    </section>
  );
}
