import type { League } from "@lucarne/shared";
import { Link } from "react-router";
import { getStatus } from "../utils/leagueList";
import LeagueLogo from "./LeagueLogo";
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
    <article className="league-mobile-card">
      <div className="league-mobile-card__main">
        <LeagueLogo league={league} />
        <div>
          <Link className="league-list__name" to={`/dashboard/leagues/${league.id}`}>{league.name}</Link>
          <p>{league.country}</p>
        </div>
      </div>
      <div className="league-mobile-card__footer">
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
