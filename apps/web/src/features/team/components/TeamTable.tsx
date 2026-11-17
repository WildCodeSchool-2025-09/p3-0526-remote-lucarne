import { teamStyles } from "../teamStyles";
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
    <div
      className={`
      overflow-x-auto rounded-[var(--radius-surface)] border
      border-[var(--color-border-default)] bg-[var(--color-bg-surface)]
      shadow-[var(--shadow-surface)] team-compact:hidden
    `}
    >
      <table
        className={`
        w-full min-w-[940px] border-collapse [&_th]:border-b
        [&_th]:border-[var(--color-border-default)] [&_th]:p-4 [&_th]:text-left
        [&_th]:align-middle [&_th]:text-[13px] [&_th]:text-[var(--color-text-secondary)]
        [&_th]:uppercase [&_td]:border-b [&_td]:border-[var(--color-border-default)]
        [&_td]:p-4 [&_td]:text-left [&_td]:align-middle [&_tr:last-child_td]:border-b-0
        [&_th:last-child]:w-16 [&_th:last-child]:text-right [&_td:last-child]:w-16
        [&_td:last-child]:text-right
      `}
      >
        <caption className="sr-only">Liste des équipes</caption>
        <thead>
          <tr>
            <th scope="col">Équipe</th>
            <th scope="col">Stade</th>
            <th scope="col">Statut</th>
            <th scope="col">Créée le</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id}>
              <td data-label="Équipe">
                <div className="flex items-center gap-3">
                  <EntityLogo logoUrl={team.logoUrl} name={team.name} />
                  <Link
                    className={teamStyles.nameLink}
                    to={`/dashboard/teams/${team.id}`}
                  >
                    {team.name}
                  </Link>
                </div>
              </td>
              <td data-label="Stade">{team.stadium ?? "—"}</td>
              <td data-label="Statut">
                <StatusBadge variant={team.isActive ? "active" : "inactive"}>
                  {team.isActive ? "Active" : "Inactive"}
                </StatusBadge>
              </td>
              <td data-label="Créée le">{formatDate(team.createdAt)}</td>
              <td data-label="Actions">
                <TeamRowActions
                  canDelete={canDelete}
                  canEdit={canEdit}
                  onAction={(action) => onAction(team, action)}
                  team={team}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeamTable;
