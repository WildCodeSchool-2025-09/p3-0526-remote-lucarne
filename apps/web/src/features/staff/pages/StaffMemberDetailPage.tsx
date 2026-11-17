import { staffStyles } from "../staffStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole } from "../../../auth/authRole";
import {
  useActivateStaffMember,
  useDeactivateStaffMember,
  useDeleteStaffMember,
  useStaffMemberDetail,
} from "../../../hooks/useStaff";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, ConfirmDialog } from "../../../ui";
import { CreateStaffAssignmentForm } from "../components/CreateStaffAssignmentForm";
import { StaffAssignments } from "../components/StaffAssignments";

type PendingAction = "activate" | "deactivate" | "delete";
const staffEditRoles = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR] as const;
const confirmationCopy: Record<
  PendingAction,
  { actionLabel: string; description: string; title: string }
> = {
  activate: {
    actionLabel: "Activer",
    description: "Le membre du staff sera réactivé. Aucune affectation ne sera créée.",
    title: "Activer ce membre du staff ?",
  },
  deactivate: {
    actionLabel: "Désactiver",
    description:
      "L’affectation courante sera clôturée. Les affectations planifiées et l’historique seront conservés.",
    title: "Désactiver ce membre du staff ?",
  },
  delete: {
    actionLabel: "Supprimer définitivement",
    description: "Cette suppression est définitive.",
    title: "Supprimer ce membre du staff ?",
  },
};
function errorMessage(error: unknown): string {
  if (error instanceof HttpError && error.status === 403) return "Accès refusé.";
  if (error instanceof HttpError && error.status === 404)
    return "Membre du staff introuvable.";
  return "Impossible de charger le membre du staff.";
}
export default function StaffMemberDetailPage() {
  const { staffMemberId = "" } = useParams();
  const query = useStaffMemberDetail(staffMemberId);
  const navigate = useNavigate();
  const activate = useActivateStaffMember();
  const deactivate = useDeactivateStaffMember();
  const remove = useDeleteStaffMember();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const role = getCurrentAppRole();
  const mutation =
    pendingAction === "activate"
      ? activate
      : pendingAction === "deactivate"
        ? deactivate
        : remove;
  const canEdit = hasRole(role, staffEditRoles);
  const canDelete = role === APP_ROLES.ADMIN;
  const confirmAction = async () => {
    if (query.data == null || pendingAction == null || mutation.isPending) return;
    const action = pendingAction;
    try {
      await mutation.mutateAsync(query.data.id);
      setPendingAction(null);
      if (action === "delete") void navigate("/dashboard/staff-members");
    } catch {
      /* The dialog retains the mutation error. */
    }
  };

  const pageName =
    (query.data ? `${query.data.firstName} ${query.data.lastName}` : undefined) ??
    "Membre du staff";
  const pageHeader = (
    <DashboardPageHeader
      resource="staff"
      mode="detail"
      resourceId={staffMemberId}
      resourceName={pageName}
      headingId="staff-detail-title"
      title={pageName}
    />
  );
  if (query.isPending)
    return (
      <section className={staffStyles.detailPage}>
        <div className={staffStyles.container}>
          {pageHeader}
          <p role="status">Chargement du membre du staff…</p>
          <Link to="/dashboard/staff-members">Retour à la liste</Link>
        </div>
      </section>
    );
  if (query.isError)
    return (
      <section className={staffStyles.detailPage}>
        <div className={staffStyles.container}>
          {pageHeader}
          <Alert variant="danger">{errorMessage(query.error)}</Alert>
          <Button onClick={() => void query.refetch()}>Réessayer</Button>
          <Link to="/dashboard/staff-members">Retour à la liste</Link>
        </div>
      </section>
    );
  if (query.data == null)
    return (
      <section className={staffStyles.detailPage}>
        <div className={staffStyles.container}>
          {pageHeader}
          <Alert variant="danger">Membre du staff introuvable.</Alert>
          <Link to="/dashboard/staff-members">Retour à la liste</Link>
        </div>
      </section>
    );
  const staffMember = query.data;
  const confirmation = pendingAction == null ? null : confirmationCopy[pendingAction];
  return (
    <section className={staffStyles.detailPage} aria-labelledby="staff-detail-title">
      <div className={staffStyles.container}>
        {pageHeader}
        <Button
          className="justify-self-start"
          onClick={() => void navigate("/dashboard/staff-members")}
          variant="ghost"
        >
          ← Retour à la liste
        </Button>
        <article className={staffStyles.detailCard}>
          <dl
            className={`
    m-0 grid gap-4 [&>div]:grid [&>div]:gap-1 [&_dt]:text-[13px] [&_dt]:font-bold
    [&_dt]:text-[var(--color-text-secondary)] [&_dt]:uppercase [&_dd]:m-0
  `}
          >
            <div>
              <dt>Équipe</dt>
              <dd>{staffMember.activeTeam?.name ?? "Non renseignée"}</dd>
            </div>
            <div>
              <dt>Nationalité</dt>
              <dd>{staffMember.nationality}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>{staffMember.isActive ? "Actif" : "Inactif"}</dd>
            </div>
          </dl>
          <StaffAssignments
            assignments={staffMember.assignments}
            personId={staffMember.id}
            canEdit={canEdit}
          />
          {canEdit && !isScheduling ? (
            <Button onClick={() => setIsScheduling(true)} variant="outline">
              Ajouter une affectation
            </Button>
          ) : null}
          {canEdit && isScheduling ? (
            <CreateStaffAssignmentForm
              onCancel={() => setIsScheduling(false)}
              onSuccess={() => setIsScheduling(false)}
              staffMemberId={staffMember.id}
            />
          ) : null}
          <div>
            {canEdit ? (
              <Link
                className="lucarne-button lucarne-button--outline"
                to={`/dashboard/staff-members/${staffMember.id}/edit`}
              >
                Modifier
              </Link>
            ) : null}
            {canEdit ? (
              <Button
                disabled={mutation.isPending}
                onClick={() =>
                  setPendingAction(staffMember.isActive ? "deactivate" : "activate")
                }
                variant="outline"
              >
                {staffMember.isActive ? "Désactiver" : "Activer"}
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
      </div>
      <ConfirmDialog
        actionLabel={confirmation?.actionLabel}
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
        title={confirmation?.title ?? "Confirmer l’action ?"}
        variant={pendingAction === "delete" ? "danger" : "primary"}
      >
        {confirmation?.description}
      </ConfirmDialog>
    </section>
  );
}
