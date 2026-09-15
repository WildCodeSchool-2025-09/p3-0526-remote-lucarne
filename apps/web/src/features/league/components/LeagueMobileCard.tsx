import type { League } from "@lucarne/shared";
import { Link } from "react-router";
import { EntityLogo } from "../../../ui";
import { getStatus } from "../utils/leagueList";
import LeagueRowActions, { type LeagueActionType } from "./LeagueRowActions";
import LeagueStatusBadge from "./LeagueStatusBadge";

interface LeagueMobileCardProps {
  canDelete: boolean;
  canEdit: boolean;
  league: League;
  onAction: (league: League, action: LeagueActionType) => void;
}

function LeagueMobileCard({ canDelete, canEdit, league, onAction }: LeagueMobileCardProps) {
  const status = getStatus(league);

  return (
    <article className="dashboard-list-card" role="listitem">
      <div className="dashboard-list-card__main">
        <EntityLogo logoUrl={league.logoUrl} name={league.name} />
        <div>
          <Link className="dashboard-list__name" to={`/dashboard/leagues/${league.id}`}>{league.name}</Link>
          <p>{league.country}</p>
        </div>
      </div>
      <div className="dashboard-list-card__footer">
        <LeagueStatusBadge status={status} />
        <LeagueRowActions
          canDelete={canDelete}
          canEdit={canEdit}
          league={league}
          onAction={(action) => onAction(league, action)}
        />
      </div>
    </article>
  );
}

export default LeagueMobileCard;
