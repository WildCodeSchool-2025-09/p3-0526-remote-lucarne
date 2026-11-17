import { teamStyles } from "../teamStyles";
import type { Team } from "@lucarne/shared";
import { Link } from "react-router";
import { EntityLogo, StatusBadge } from "../../../ui";
import TeamRowActions, { type TeamActionType } from "./TeamRowActions";

interface TeamMobileCardProps {
  canDelete: boolean;
  canEdit: boolean;
  onAction: (team: Team, action: TeamActionType) => void;
  team: Team;
}

function TeamMobileCard({ canDelete, canEdit, onAction, team }: TeamMobileCardProps) {
  return (
    <article
      className="grid gap-4 rounded-[10px] bg-[var(--color-bg-subtle)] p-3"
      role="listitem"
    >
      <div className="flex items-center gap-3">
        <EntityLogo logoUrl={team.logoUrl} name={team.name} />
        <div>
          <Link className={teamStyles.nameLink} to={`/dashboard/teams/${team.id}`}>
            {team.name}
          </Link>
          {team.stadium ? (
            <p className="mt-1 mb-0 text-[13px] text-[var(--color-text-secondary)] team-mobile:hidden">
              {team.stadium}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className={`
        flex items-center justify-between team-compact:[&_.resource-actions-popover]:ml-auto
        team-compact:[&_.resource-actions-popover__trigger]:border!
        team-compact:[&_.resource-actions-popover__trigger]:border-[var(--color-action-primary)]!
        team-compact:[&_.resource-actions-popover__trigger]:text-[var(--color-text-success)]!
        team-compact:[&_.resource-actions-popover__trigger]:min-w-[104px]!
        team-compact:[&_.resource-actions-popover__icon]:hidden!
        team-compact:[&_.resource-actions-popover__mobile-label]:inline!
      `}
      >
        <StatusBadge variant={team.isActive ? "active" : "inactive"}>
          {team.isActive ? "Active" : "Inactive"}
        </StatusBadge>
        <TeamRowActions
          canDelete={canDelete}
          canEdit={canEdit}
          onAction={(action) => onAction(team, action)}
          team={team}
        />
      </div>
    </article>
  );
}

export default TeamMobileCard;
