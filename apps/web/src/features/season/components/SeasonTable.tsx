import type { Season } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { Button } from "../../../ui";
import SeasonStatusBadge from "./SeasonStatusBadge";

interface SeasonTableProps {
  canSetCurrent: boolean;
  canUpdate: boolean;
  onSetCurrent: (season: Season) => void;
  seasons: Season[];
}

function SeasonTable({ canSetCurrent, canUpdate, onSetCurrent, seasons }: SeasonTableProps) {
  return (
    <div className="dashboard-list__table-wrapper">
      <table className="dashboard-list__table">
        <caption className="sr-only">Liste des saisons</caption>
        <thead>
          <tr>
            <th scope="col">Saison</th>
            <th scope="col">Période</th>
            <th scope="col">État</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.id}>
              <td data-label="Saison"><Link className="dashboard-list__name" to={`/dashboard/seasons/${season.id}`}>{season.name}</Link></td>
              <td data-label="Période">{formatDate(season.startDate)} – {formatDate(season.endDate)}</td>
              <td data-label="État"><SeasonStatusBadge status={season.status} /></td>
              <td data-label="Actions">
                <div className="dashboard-list__actions">
                  {canUpdate ? <Link className="lucarne-button lucarne-button--outline lucarne-button--sm" to={`/dashboard/seasons/${season.id}/edit`}>Modifier</Link> : null}
                  {canSetCurrent && season.status !== "CURRENT" ? <Button onClick={() => onSetCurrent(season)} size="sm" variant="outline">Définir courante</Button> : null}
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
