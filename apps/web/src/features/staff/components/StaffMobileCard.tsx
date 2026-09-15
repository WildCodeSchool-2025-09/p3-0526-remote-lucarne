import type { StaffMember } from "@lucarne/shared";
import { Link } from "react-router";
import { EntityAvatar, StatusBadge } from "../../../ui";
import StaffRowActions, { type StaffActionType } from "./StaffRowActions";

interface StaffMobileCardProps { canDelete: boolean; canEdit: boolean; onAction: (staffMember: StaffMember, action: StaffActionType) => void; staffMember: StaffMember; }

function StaffMobileCard({ canDelete, canEdit, onAction, staffMember }: StaffMobileCardProps) {
  const name = `${staffMember.firstName} ${staffMember.lastName}`;
  return <article className="dashboard-list-card dashboard-list-card--staff" role="listitem"><div className="dashboard-list-card__main"><EntityAvatar imageUrl={staffMember.pictureUrl} name={name} /><div><Link className="dashboard-list__name" to={`/dashboard/staff-members/${staffMember.id}`}>{name}</Link><p className="dashboard-list-card__optional-secondary">{staffMember.activeTeam?.name ?? "Équipe non renseignée"}</p><p className="dashboard-list-card__optional-secondary">{staffMember.nationality}</p></div></div><div className="dashboard-list-card__footer"><StatusBadge variant={staffMember.isActive ? "active" : "inactive"}>{staffMember.isActive ? "Actif" : "Inactif"}</StatusBadge><StaffRowActions canDelete={canDelete} canEdit={canEdit} onAction={(action) => onAction(staffMember, action)} staffMember={staffMember} /></div></article>;
}

export default StaffMobileCard;
