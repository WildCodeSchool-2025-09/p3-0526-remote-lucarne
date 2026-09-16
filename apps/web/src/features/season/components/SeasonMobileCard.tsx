import type { Season } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { Button } from "../../../ui";
import SeasonStatusBadge from "./SeasonStatusBadge";

interface SeasonMobileCardProps {
  canSetCurrent: boolean;
  canUpdate: boolean;
  onSetCurrent: (season: Season) => void;
  season: Season;
}

function SeasonMobileCard({ canSetCurrent, canUpdate, onSetCurrent, season }: SeasonMobileCardProps) {
  return (
    <article className="dashboard-list-card" role="listitem">
      <header><h2><Link className="dashboard-list__name" to={`/dashboard/seasons/${season.id}`}>{season.name}</Link></h2><SeasonStatusBadge status={season.status} /></header>
      <p>{formatDate(season.startDate)} – {formatDate(season.endDate)}</p>
      <div className="dashboard-list-card__actions">
        {canUpdate ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/seasons/${season.id}/edit`}>Modifier</Link> : null}
        {canSetCurrent && season.status !== "CURRENT" ? <Button onClick={() => onSetCurrent(season)} variant="outline">Définir courante</Button> : null}
      </div>
    </article>
  );
}

export default SeasonMobileCard;
