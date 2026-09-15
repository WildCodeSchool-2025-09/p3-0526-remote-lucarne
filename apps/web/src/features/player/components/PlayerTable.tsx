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
    <div className="dashboard-list__table-wrapper">
      <table className="dashboard-list__table">
        <caption className="sr-only">Liste des joueuses</caption>
        <thead><tr><th scope="col">Joueur</th><th scope="col">Équipe</th><th scope="col">Poste</th><th scope="col">Statut</th><th scope="col">Créé le</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {players.map((player) => {
            const name = `${player.firstName} ${player.lastName}`;
            return <tr key={player.id}>
              <td data-label="Joueur"><div className="dashboard-list__resource-cell"><EntityAvatar imageUrl={player.pictureUrl} name={name} /><Link className="dashboard-list__name" to={`/dashboard/players/${player.id}`}>{name}</Link></div></td>
              <td data-label="Équipe">{player.activeTeam?.name ?? "—"}</td>
              <td data-label="Poste">{player.position ?? "—"}</td>
              <td data-label="Statut"><StatusBadge variant={player.isActive ? "active" : "inactive"}>{player.isActive ? "Active" : "Inactive"}</StatusBadge></td>
              <td data-label="Créé le">{formatDate(player.createdAt)}</td><td data-label="Actions"><PlayerRowActions canDelete={canDelete} canEdit={canEdit} onAction={(action) => onAction(player, action)} player={player} /></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PlayerTable;
