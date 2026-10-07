import { playerStyles } from "../playerStyles";
import type { Player } from "@lucarne/shared";
import { Link } from "react-router";
import { formatDate } from "../../../lib/dateFormat";
import { EntityAvatar, StatusBadge } from "../../../ui";
import PlayerRowActions, { type PlayerActionType } from "./PlayerRowActions";

interface PlayerTableProps {
  players: Player[];
  canDelete: boolean;
  canEdit: boolean;
  onAction: (player: Player, action: PlayerActionType) => void;
}

function PlayerTable({ canDelete, canEdit, onAction, players }: PlayerTableProps) {
  return (
    <div
      className={`
      overflow-x-auto rounded-[var(--radius-surface)] border
      border-[var(--color-border-default)] bg-[var(--color-bg-surface)]
      shadow-[var(--shadow-surface)] player-compact:hidden
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
        <caption className="sr-only">Liste des joueuses</caption>
        <thead>
          <tr>
            <th scope="col">Joueuse</th>
            <th scope="col">Équipe</th>
            <th scope="col">Poste</th>
            <th scope="col">Statut</th>
            <th scope="col">Créé le</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const name = `${player.firstName} ${player.lastName}`;

            return (
              <tr key={player.id}>
                <td data-label="Joueuse">
                  <div className="flex items-center gap-3">
                    <EntityAvatar imageUrl={player.pictureUrl} name={name} />
                    <Link
                      className={playerStyles.nameLink}
                      to={`/dashboard/players/${player.id}`}
                    >
                      {name}
                    </Link>
                  </div>
                </td>
                <td data-label="Équipe">{player.activeTeam?.name ?? "—"}</td>
                <td data-label="Poste">{player.position ?? "—"}</td>
                <td data-label="Statut">
                  <StatusBadge variant={player.isActive ? "active" : "inactive"}>
                    {player.isActive ? "Active" : "Inactive"}
                  </StatusBadge>
                </td>
                <td data-label="Créé le">{formatDate(player.createdAt)}</td>
                <td data-label="Actions">
                  <PlayerRowActions
                    canDelete={canDelete}
                    canEdit={canEdit}
                    onAction={(action) => onAction(player, action)}
                    player={player}
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

export default PlayerTable;
