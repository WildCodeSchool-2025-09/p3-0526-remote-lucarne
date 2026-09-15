import type { ListStaffMembersParams, StaffMember } from "@lucarne/shared";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole, PLAYER_WRITE_ROLES } from "../../../auth/authRole";
import DashboardListPageHeader from "../../../components/dashboard/DashboardListPageHeader";
import { useActivateStaffMember, useDeactivateStaffMember, useDeleteStaffMember, useStaffMemberList } from "../../../hooks/useStaff";
import { Alert, Button, ConfirmDialog, EmptyState, LoadingState, Pagination, temporaryIcons } from "../../../ui";
import StaffFilters from "../components/StaffFilters";
import StaffMobileCard from "../components/StaffMobileCard";
import StaffTable from "../components/StaffTable";
import { type StaffActionType } from "../components/StaffRowActions";
import { parseParams, updateParams } from "../utils/staffMemberList";

export default function StaffMemberListPage() {
  const [url, setUrl] = useSearchParams();
  const params = parseParams(url);
  const query = useStaffMemberList(params);
  const activate = useActivateStaffMember();
  const deactivate = useDeactivateStaffMember();
  const remove = useDeleteStaffMember();
  const role = getCurrentAppRole();
  const canEdit = hasRole(role, PLAYER_WRITE_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;
  const [pendingAction, setPendingAction] = useState<{ staffMember: StaffMember; type: StaffActionType } | null>(null);
  const setCriteria = (change: Partial<ListStaffMembersParams>) => setUrl((current) => updateParams(current, { ...change, page: change.page ?? 1 }));
  const staffMembers = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const staffNames = useMemo(() => staffMembers.map((member) => `${member.firstName} ${member.lastName}`), [staffMembers]);
  const teamNames = useMemo(() => staffMembers.flatMap((member) => member.activeTeam?.name ? [member.activeTeam.name] : []), [staffMembers]);
  const totalPages = query.data?.pagination.totalPages ?? 0;
  const isFiltered = Boolean(params.search || params.teamName || params.status !== "ALL");
  const mutation = pendingAction?.type === "activate" ? activate : pendingAction?.type === "deactivate" ? deactivate : remove;
  const confirmAction = async () => {
    if (pendingAction == null || mutation.isPending) return;
    try { await mutation.mutateAsync(pendingAction.staffMember.id); setPendingAction(null); } catch { /* Dialog displays the error. */ }
  };

  useEffect(() => {
    if (query.isSuccess && totalPages > 0 && (params.page ?? 1) > totalPages) setUrl((current) => updateParams(current, { page: totalPages }));
  }, [params.page, query.isSuccess, setUrl, totalPages]);

  return (
    <section aria-labelledby="staff-list-title" className="dashboard-list-page">
      <div className="dashboard-list-page__container">
        <DashboardListPageHeader canCreate count={query.data?.pagination.totalItems ?? 0} countLabel="membres" createHref="/dashboard/staff-members/new" createLabel="Ajouter un membre du staff" description="Consultez les membres du staff actifs et inactifs." headingId="staff-list-title" icon={temporaryIcons.staff} title="Staff" />
        <StaffFilters canCreate onChange={setCriteria} onReset={() => setUrl(new URLSearchParams())} params={params} staffNames={staffNames} teamNames={teamNames} />
        {query.isPending ? <LoadingState>Chargement du staff…</LoadingState> : null}
        {query.isError ? <div className="dashboard-list__state"><Alert>Impossible de charger le staff.</Alert><Button onClick={() => void query.refetch()}>Réessayer</Button></div> : null}
        {query.isSuccess && query.data.data.length === 0 ? <EmptyState action={isFiltered ? <Button onClick={() => setUrl(new URLSearchParams())} variant="outline">Réinitialiser les critères</Button> : undefined}>{isFiltered ? "Aucun membre du staff ne correspond à vos critères." : "Aucun membre du staff n’est disponible."}</EmptyState> : null}
        {query.isSuccess && query.data.data.length > 0 ? <><StaffTable canDelete={canDelete} canEdit={canEdit} onAction={(staffMember, type) => setPendingAction({ staffMember, type })} staffMembers={query.data.data} /><div aria-label="Liste des membres du staff sous forme de cartes" className="dashboard-list-cards" role="list">{query.data.data.map((staffMember) => <StaffMobileCard canDelete={canDelete} canEdit={canEdit} key={staffMember.id} onAction={(selectedMember, type) => setPendingAction({ staffMember: selectedMember, type })} staffMember={staffMember} />)}</div></> : null}
        {query.isSuccess && totalPages > 0 ? <Pagination label="Pagination du staff" onPageChange={(page) => setCriteria({ page })} page={params.page ?? 1} totalPages={totalPages} /> : null}
      </div>
      <ConfirmDialog actionLabel={pendingAction?.type === "delete" ? "Supprimer définitivement" : pendingAction?.type === "deactivate" ? "Désactiver" : "Activer"} error={mutation.isError ? "Cette action est impossible pour le moment." : undefined} onCancel={() => { mutation.reset(); setPendingAction(null); }} onConfirm={() => void confirmAction()} open={pendingAction != null} pending={mutation.isPending} title={pendingAction?.type === "delete" ? "Supprimer ce membre du staff ?" : pendingAction?.type === "deactivate" ? "Désactiver ce membre du staff ?" : "Activer ce membre du staff ?"} variant={pendingAction?.type === "delete" ? "danger" : "primary"}>{pendingAction?.type === "delete" ? "Cette suppression est définitive." : pendingAction?.type === "deactivate" ? "L’affectation courante sera clôturée. Les affectations planifiées et l’historique seront conservés." : "Le membre du staff sera réactivé. Aucune affectation ne sera créée."}</ConfirmDialog>
    </section>
  );
}
