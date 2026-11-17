import { leagueStyles } from "../leagueStyles";
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

function LeagueMobileCard({
  canDelete,
  canEdit,
  league,
  onAction,
}: LeagueMobileCardProps) {
  const status = getStatus(league);

  return (
    <article
      className="grid gap-4 rounded-[10px] bg-[var(--color-bg-subtle)] p-3"
      role="listitem"
    >
      <div
        className={
          "flex items-center gap-3 [&_p]:mt-1 [&_p]:mb-0 [&_p]:text-[13px] [&_p]:text-[var(--color-text-secondary)]"
        }
      >
        <EntityLogo logoUrl={league.logoUrl} name={league.name} />
        <div>
          <Link className={leagueStyles.nameLink} to={`/dashboard/leagues/${league.id}`}>
            {league.name}
          </Link>
          <p>{league.country}</p>
        </div>
      </div>
      <div className={leagueStyles.cardFooter}>
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
