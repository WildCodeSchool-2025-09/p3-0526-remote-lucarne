import { staffStyles } from "../staffStyles";
import type { StaffMember } from "@lucarne/shared";
import { Link } from "react-router";
import { EntityAvatar, StatusBadge } from "../../../ui";
import StaffRowActions, { type StaffActionType } from "./StaffRowActions";

interface StaffMobileCardProps {
  canDelete: boolean;
  canEdit: boolean;
  onAction: (staffMember: StaffMember, action: StaffActionType) => void;
  staffMember: StaffMember;
}

function StaffMobileCard({
  canDelete,
  canEdit,
  onAction,
  staffMember,
}: StaffMobileCardProps) {
  const name = `${staffMember.firstName} ${staffMember.lastName}`;
  return (
    <article
      className="grid gap-4 rounded-[10px] bg-[var(--color-bg-subtle)] p-3"
      role="listitem"
    >
      <div className="flex items-center gap-3">
        <EntityAvatar imageUrl={staffMember.pictureUrl} name={name} />
        <div>
          <Link
            className={staffStyles.nameLink}
            to={`/dashboard/staff-members/${staffMember.id}`}
          >
            {name}
          </Link>
          <p className="mt-1 mb-0 text-[13px] text-[var(--color-text-secondary)]">
            {staffMember.activeTeam?.name ?? "Équipe non renseignée"}
          </p>
          <p className="mt-1 mb-0 text-[13px] text-[var(--color-text-secondary)]">
            {staffMember.nationality}
          </p>
        </div>
      </div>
      <div
        className={`
        flex items-center justify-between staff-compact:[&_.resource-actions-popover]:ml-auto
        staff-compact:[&_.resource-actions-popover__trigger]:border!
        staff-compact:[&_.resource-actions-popover__trigger]:border-[var(--color-action-primary)]!
        staff-compact:[&_.resource-actions-popover__trigger]:text-[var(--color-text-success)]!
        staff-compact:[&_.resource-actions-popover__trigger]:min-w-[104px]!
        staff-compact:[&_.resource-actions-popover__icon]:hidden!
        staff-compact:[&_.resource-actions-popover__mobile-label]:inline!
      `}
      >
        <StatusBadge variant={staffMember.isActive ? "active" : "inactive"}>
          {staffMember.isActive ? "Actif" : "Inactif"}
        </StatusBadge>
        <StaffRowActions
          canDelete={canDelete}
          canEdit={canEdit}
          onAction={(action) => onAction(staffMember, action)}
          staffMember={staffMember}
        />
      </div>
    </article>
  );
}

export default StaffMobileCard;
