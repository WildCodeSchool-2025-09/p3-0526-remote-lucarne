import type { League } from "@lucarne/shared";
import { Link } from "react-router";
import { getStatus } from "../utils/leagueList";
import LeagueLogo from "./LeagueLogo";
import LeagueRowActions, { type LeagueActionType } from "./LeagueRowActions";
import LeagueStatusBadge from "./LeagueStatusBadge";
import { formatDate } from "../utils/leagueList";

interface LeagueTableProps {
  canDelete: boolean;
  canEdit: boolean;
  leagues: League[];
  onAction: (league: League, action: LeagueActionType) => void;
}

function LeagueTable({ canDelete, canEdit, leagues, onAction }: LeagueTableProps) {
  return (
    <div className="league-list__table-wrapper">
      <table className="league-list__table">
        <caption className="sr-only">Liste des ligues</caption>
        <thead>
          <tr>
            <th scope="col">Ligue</th>
            <th scope="col">Pays</th>
            <th scope="col">Statut</th>
            <th scope="col">Créée le</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {leagues.map((league) => {
            const status = getStatus(league);
            return (
              <tr key={league.id}>
                <td data-label="Ligue">
                  <div className="league-list__league-cell">
                    <LeagueLogo league={league} />
                    <Link className="league-list__name" to={`/dashboard/leagues/${league.id}`}>{league.name}</Link>
                  </div>
                </td>
                <td data-label="Pays">{league.country}</td>
                <td data-label="Statut"><LeagueStatusBadge status={status} /></td>
                <td data-label="Créée le">{formatDate(league.createdAt)}</td>
                <td data-label="Actions">
                  <LeagueRowActions
                    canDelete={canDelete}
                    canEdit={canEdit}
                    league={league}
                    onAction={(action) => onAction(league, action)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LeagueTable;
