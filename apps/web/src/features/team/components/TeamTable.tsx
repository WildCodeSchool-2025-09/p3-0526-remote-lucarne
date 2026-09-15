import type { Team } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { EntityLogo, StatusBadge } from "../../../ui";
import TeamRowActions, { type TeamActionType } from "./TeamRowActions";

interface TeamTableProps {
  canDelete: boolean;
  canEdit: boolean;
  onAction: (team: Team, action: TeamActionType) => void;
  teams: Team[];
}

function TeamTable({ canDelete, canEdit, onAction, teams }: TeamTableProps) {
  return (
    <div className="dashboard-list__table-wrapper">
      <table className="dashboard-list__table">
        <caption className="sr-only">Liste des équipes</caption>
        <thead>
          <tr>
            <th scope="col">Équipe</th>
            <th scope="col">Stade</th>
            <th scope="col">Statut</th>
            <th scope="col">Créée le</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id}>
              <td data-label="Équipe">
                <div className="dashboard-list__resource-cell">
                  <EntityLogo logoUrl={team.logoUrl} name={team.name} />
                  <Link className="dashboard-list__name" to={`/dashboard/teams/${team.id}`}>{team.name}</Link>
                </div>
              </td>
              <td data-label="Stade">{team.stadium ?? "—"}</td>
              <td data-label="Statut">
                <StatusBadge variant={team.isActive ? "active" : "inactive"}>{team.isActive ? "Active" : "Inactive"}</StatusBadge>
              </td>
              <td data-label="Créée le">{formatDate(team.createdAt)}</td>
              <td data-label="Actions">
                <TeamRowActions canDelete={canDelete} canEdit={canEdit} onAction={(action) => onAction(team, action)} team={team} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeamTable;
