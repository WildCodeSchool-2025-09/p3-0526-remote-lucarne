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
    <article className="dashboard-list-card" role="listitem">
      <div className="dashboard-list-card__main">
        <EntityLogo logoUrl={team.logoUrl} name={team.name} />
        <div>
          <Link className="dashboard-list__name" to={`/dashboard/teams/${team.id}`}>{team.name}</Link>
          {team.stadium ? <p className="dashboard-list-card__optional-secondary">{team.stadium}</p> : null}
        </div>
      </div>
      <div className="dashboard-list-card__footer">
        <StatusBadge variant={team.isActive ? "active" : "inactive"}>{team.isActive ? "Active" : "Inactive"}</StatusBadge>
        <TeamRowActions canDelete={canDelete} canEdit={canEdit} onAction={(action) => onAction(team, action)} team={team} />
      </div>
    </article>
  );
}

export default TeamMobileCard;
