import { staffStyles } from "../staffStyles";
import type { StaffMember } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { EntityAvatar, StatusBadge } from "../../../ui";
import StaffRowActions, { type StaffActionType } from "./StaffRowActions";

interface StaffTableProps {
  canDelete: boolean;
  canEdit: boolean;
  onAction: (staffMember: StaffMember, action: StaffActionType) => void;
  staffMembers: StaffMember[];
}

function StaffTable({ canDelete, canEdit, onAction, staffMembers }: StaffTableProps) {
  return (
    <div
      className={`
      overflow-x-auto rounded-[var(--radius-surface)] border
      border-[var(--color-border-default)] bg-[var(--color-bg-surface)]
      shadow-[var(--shadow-surface)] staff-compact:hidden
    `}
    >
      <table
        className={`
        w-full min-w-[940px] border-collapse [&_th]:border-b
        [&_th]:border-[var(--color-border-default)] [&_th]:p-4 [&_th]:text-left
        [&_th]:align-middle [&_th]:text-[13px] [&_th]:text-[var(--color-text-secondary)]
        [&_th]:uppercase [&_td]:border-b [&_td]:border-[var(--color-border-default)]
        [&_td]:p-4 [&_td]:text-left [&_td]:align-middle [&_tr:last-child_td]:border-b-0
        [&_th:last-child]:w-16 [&_th:last-child]:text-right [&_td:last-child]:w-16
        [&_td:last-child]:text-right
      `}
      >
        <caption className="sr-only">Liste des membres du staff</caption>
        <thead>
          <tr>
            <th scope="col">Membre du staff</th>
            <th scope="col">Équipe</th>
            <th scope="col">Nationalité</th>
            <th scope="col">Statut</th>
            <th scope="col">Créé le</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {staffMembers.map((staffMember) => {
            const name = `${staffMember.firstName} ${staffMember.lastName}`;
            return (
              <tr key={staffMember.id}>
                <td data-label="Membre du staff">
                  <div className="flex items-center gap-3">
                    <EntityAvatar imageUrl={staffMember.pictureUrl} name={name} />
                    <Link
                      className={staffStyles.nameLink}
                      to={`/dashboard/staff-members/${staffMember.id}`}
                    >
                      {name}
                    </Link>
                  </div>
                </td>
                <td data-label="Équipe">{staffMember.activeTeam?.name ?? "—"}</td>
                <td data-label="Nationalité">{staffMember.nationality}</td>
                <td data-label="Statut">
                  <StatusBadge variant={staffMember.isActive ? "active" : "inactive"}>
                    {staffMember.isActive ? "Actif" : "Inactif"}
                  </StatusBadge>
                </td>
                <td data-label="Créé le">{formatDate(staffMember.createdAt)}</td>
                <td data-label="Actions">
                  <StaffRowActions
                    canDelete={canDelete}
                    canEdit={canEdit}
                    onAction={(action) => onAction(staffMember, action)}
                    staffMember={staffMember}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default StaffTable;
