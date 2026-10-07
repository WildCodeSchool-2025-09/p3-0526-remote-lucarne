import { seasonStyles } from "../seasonStyles";
import type { SeasonListItem } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { formatDateTime } from "../../../lib/dateTimeFormat";

interface SeasonTableProps {
  canUpdate: boolean;
  seasons: SeasonListItem[];
}

function SeasonTable({ canUpdate, seasons }: SeasonTableProps) {
  return (
    <div className={seasonStyles.tableWrapper}>
      <table className={seasonStyles.table}>
        <caption className="sr-only">Liste des saisons</caption>
        <thead>
          <tr>
            <th scope="col">Saison</th>
            <th scope="col">Ligues</th>
            <th scope="col">Période</th>
            <th scope="col">Création</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.id}>
              <td data-label="Saison">
                <Link
                  className={seasonStyles.nameLink}
                  to={`/dashboard/seasons/${season.id}`}
                >
                  {season.name}
                </Link>
              </td>
              <td data-label="Ligue">
                {season.leagueSeasons.map((edition) => edition.league.name).join(", ") ||
                  "Aucune ligue"}
              </td>
              <td data-label="Période">
                {formatDate(season.startDate)} – {formatDate(season.endDate)}
              </td>
              <td data-label="Création">{formatDateTime(season.createdAt)}</td>
              <td data-label="Actions">
                <div>
                  {canUpdate ? (
                    <Link
                      className="lucarne-button lucarne-button--outline lucarne-button--sm"
                      to={`/dashboard/seasons/${season.id}/edit`}
                    >
                      Modifier
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SeasonTable;
