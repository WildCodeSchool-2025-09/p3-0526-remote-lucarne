import type { StaffMember } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { EntityAvatar, StatusBadge } from "../../../ui";
import StaffRowActions, { type StaffActionType } from "./StaffRowActions";

interface StaffTableProps { canDelete: boolean; canEdit: boolean; onAction: (staffMember: StaffMember, action: StaffActionType) => void; staffMembers: StaffMember[]; }

function StaffTable({ canDelete, canEdit, onAction, staffMembers }: StaffTableProps) {
  return <div className="dashboard-list__table-wrapper"><table className="dashboard-list__table"><caption className="sr-only">Liste des membres du staff</caption><thead><tr><th scope="col">Membre du staff</th><th scope="col">Équipe</th><th scope="col">Nationalité</th><th scope="col">Statut</th><th scope="col">Créé le</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{staffMembers.map((staffMember) => { const name = `${staffMember.firstName} ${staffMember.lastName}`; return <tr key={staffMember.id}><td data-label="Membre du staff"><div className="dashboard-list__resource-cell"><EntityAvatar imageUrl={staffMember.pictureUrl} name={name} /><Link className="dashboard-list__name" to={`/dashboard/staff-members/${staffMember.id}`}>{name}</Link></div></td><td data-label="Équipe">{staffMember.activeTeam?.name ?? "—"}</td><td data-label="Nationalité">{staffMember.nationality}</td><td data-label="Statut"><StatusBadge variant={staffMember.isActive ? "active" : "inactive"}>{staffMember.isActive ? "Actif" : "Inactif"}</StatusBadge></td><td data-label="Créé le">{formatDate(staffMember.createdAt)}</td><td data-label="Actions"><StaffRowActions canDelete={canDelete} canEdit={canEdit} onAction={(action) => onAction(staffMember, action)} staffMember={staffMember} /></td></tr>; })}</tbody></table></div>;
}

export default StaffTable;
