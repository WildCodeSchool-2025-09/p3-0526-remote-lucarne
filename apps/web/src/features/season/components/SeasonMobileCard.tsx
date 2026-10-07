import { seasonStyles } from "../seasonStyles";
import type { SeasonListItem } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { formatDateTime } from "../../../lib/dateTimeFormat";

interface SeasonMobileCardProps {
  canUpdate: boolean;
  season: SeasonListItem;
}

function SeasonMobileCard({ canUpdate, season }: SeasonMobileCardProps) {
  return (
    <article
      className="grid gap-4 rounded-[10px] bg-[var(--color-bg-subtle)] p-3"
      role="listitem"
    >
      <header>
        <h2>
          <Link className={seasonStyles.nameLink} to={`/dashboard/seasons/${season.id}`}>
            {season.name}
          </Link>
        </h2>
      </header>
      <dl
        className={`
          grid gap-3 m-0 [&_div]:grid [&_div]:gap-1 [&_dt]:text-[0.75rem] [&_dt]:font-bold
          [&_dt]:text-[var(--color-text-secondary)] [&_dt]:uppercase [&_dd]:m-0
        `}
      >
        <div>
          <dt>Ligues</dt>
          <dd>
            {season.leagueSeasons.map((edition) => edition.league.name).join(", ") ||
              "Aucune ligue"}
          </dd>
        </div>
        <div>
          <dt>Période</dt>
          <dd>
            {formatDate(season.startDate)} – {formatDate(season.endDate)}
          </dd>
        </div>
        <div>
          <dt>Création</dt>
          <dd>{formatDateTime(season.createdAt)}</dd>
        </div>
      </dl>
      <div>
        {canUpdate ? (
          <Link
            className="lucarne-button lucarne-button--outline"
            to={`/dashboard/seasons/${season.id}/edit`}
          >
            Modifier
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default SeasonMobileCard;
