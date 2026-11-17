import { teamStyles } from "../teamStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import TeamRoster from "../components/TeamRoster";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  APP_ROLES,
  getCurrentAppRole,
  hasRole,
  TEAM_EDIT_ROLES,
} from "../../../auth/authRole";
import { useTeamDetail } from "../../../hooks/useTeamDetail";
import { Alert, Button, ConfirmDialog } from "../../../ui";
import { useTeamDeletionPreview, useTeamMutation } from "../hooks/useTeamMutation";

type PendingAction = "activate" | "deactivate" | "delete";

function deletionDescription(dependencies: Record<string, number>): string {
  const labels: Record<string, string> = {
    participations: "participation(s)",
    playerAssignments: "affectation(s) de joueuse",
    staffAssignments: "affectation(s) de staff",
    homeMatches: "match(s) à domicile",
    awayMatches: "match(s) à l’extérieur",
  };
  const protectedRecords = Object.entries(dependencies)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${count} ${labels[name]}`)
    .join(", ");
  return protectedRecords === ""
    ? "Aucune dépendance protégée : la suppression sera définitive."
    : `Suppression impossible : ${protectedRecords}. L’historique est conservé.`;
}

export default function TeamDetailPage() {
  const { teamId = "" } = useParams();
  const query = useTeamDetail(teamId);
  const navigate = useNavigate();
  const mutation = useTeamMutation();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const deletionPreview = useTeamDeletionPreview(teamId, pendingAction === "delete");
  const role = getCurrentAppRole();
  const canEdit = hasRole(role, TEAM_EDIT_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;

  const confirmAction = async () => {
    if (query.data == null || pendingAction == null || mutation.isPending) return;
    if (pendingAction === "delete" && deletionPreview.data?.canDelete !== true) return;
    const action = pendingAction;
    try {
      await mutation.mutateAsync({ action, id: query.data.id });
      setPendingAction(null);
      if (action === "delete") void navigate("/dashboard/teams");
    } catch {
      /* The dialog retains the mutation error. */
    }
  };

  const pageName = query.data?.name ?? "Équipe";
  const pageHeader = (
    <DashboardPageHeader
      resource="teams"
      mode="detail"
      resourceId={teamId}
      resourceName={pageName}
      headingId="team-detail-title"
      title={pageName}
    />
  );
  if (query.isPending)
    return (
      <section className={teamStyles.detailPage}>
        <div className={teamStyles.container}>
          {pageHeader}
          <p role="status">Chargement de l’équipe…</p>
          <Link to="/dashboard/teams">Retour à la liste</Link>
        </div>
      </section>
    );
  if (query.isError)
    return (
      <section className={teamStyles.detailPage}>
        <div className={teamStyles.container}>
          {pageHeader}
          <Alert variant="danger">Impossible de charger l’équipe.</Alert>
          <Link to="/dashboard/teams">Retour à la liste</Link>
          <Button onClick={() => void query.refetch()}>Réessayer</Button>
        </div>
      </section>
    );
  if (query.data == null)
    return (
      <section className={teamStyles.detailPage}>
        <div className={teamStyles.container}>
          {pageHeader}
          <Alert variant="danger">Équipe introuvable.</Alert>
          <Link to="/dashboard/teams">Retour à la liste</Link>
        </div>
      </section>
    );

  const team = query.data;
  const isDeleting = pendingAction === "delete";
  const confirmationText = isDeleting
    ? deletionPreview.isPending
      ? "Vérification des dépendances protégées…"
      : deletionPreview.isError
        ? "Impossible de vérifier les dépendances. Réessayez."
        : deletionPreview.data
          ? deletionDescription(deletionPreview.data.dependencies)
          : ""
    : pendingAction === "deactivate"
      ? `${team.name} deviendra inactive et restera consultable.`
      : `${team.name} redeviendra active.`;

  return (
    <section className={teamStyles.detailPage} aria-labelledby="team-detail-title">
      <div className={teamStyles.container}>
        {pageHeader}
        <Button
          className="justify-self-start"
          onClick={() => void navigate("/dashboard/teams")}
          variant="ghost"
        >
          ← Retour à la liste
        </Button>
        <article className={teamStyles.detailCard}>
          <div className="flex items-start gap-8 team-mobile:flex-col team-mobile:items-center">
            <dl
              className={`
    m-0 grid gap-4 [&>div]:grid [&>div]:gap-1 [&_dt]:text-[13px] [&_dt]:font-bold
    [&_dt]:text-[var(--color-text-secondary)] [&_dt]:uppercase [&_dd]:m-0
  `}
            >
              <div>
                <dt>Stade</dt>
                <dd>{team.stadium ?? "Non renseigné"}</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>{team.isActive ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
          </div>
          <div className="flex gap-2">
            {canEdit ? (
              <Link
                className="lucarne-button lucarne-button--outline"
                to={`/dashboard/teams/${team.id}/edit`}
              >
                Modifier
              </Link>
            ) : null}
            {canEdit ? (
              <Button
                disabled={mutation.isPending}
                onClick={() =>
                  setPendingAction(team.isActive ? "deactivate" : "activate")
                }
                variant="outline"
              >
                {team.isActive ? "Désactiver" : "Activer"}
              </Button>
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
        <TeamRoster teamId={team.id} />
      </div>
      <ConfirmDialog
        actionLabel={isDeleting ? "Supprimer définitivement" : "Confirmer"}
        error={
          mutation.isError ? "Cette action est impossible pour le moment." : undefined
        }
        onCancel={() => {
          mutation.reset();
          setPendingAction(null);
        }}
        onConfirm={() => void confirmAction()}
        open={pendingAction != null}
        pending={mutation.isPending}
        title={
          isDeleting ? "Supprimer définitivement l’équipe ?" : "Confirmer l’action ?"
        }
        variant={isDeleting ? "danger" : "primary"}
      >
        {confirmationText}
      </ConfirmDialog>
    </section>
  );
}
