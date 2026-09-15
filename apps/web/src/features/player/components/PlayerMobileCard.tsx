import type { Player } from "@lucarne/shared";
import { Link } from "react-router";
import { EntityAvatar, StatusBadge } from "../../../ui";
import PlayerRowActions, { type PlayerActionType } from "./PlayerRowActions";

interface PlayerMobileCardProps {
  player: Player;
  canDelete: boolean;
  canEdit: boolean;
  onAction: (player: Player, action: PlayerActionType) => void;
}

function PlayerMobileCard({ canDelete, canEdit, onAction, player }: PlayerMobileCardProps) {
  const name = `${player.firstName} ${player.lastName}`;

  return (
    <article className="dashboard-list-card dashboard-list-card--player" role="listitem">
      <div className="dashboard-list-card__main">
        <EntityAvatar imageUrl={player.pictureUrl} name={name} />
        <div>
          <Link className="dashboard-list__name" to={`/dashboard/players/${player.id}`}>{name}</Link>
          {player.activeTeam ? <p className="dashboard-list-card__optional-secondary">{player.activeTeam.name}</p> : null}
          {player.position ? <p className="dashboard-list-card__optional-secondary">{player.position}</p> : null}
          {player.nationality ? <p className="dashboard-list-card__optional-secondary">{player.nationality}</p> : null}
        </div>
      </div>
      <div className="dashboard-list-card__footer">
        <StatusBadge variant={player.isActive ? "active" : "inactive"}>{player.isActive ? "Active" : "Inactive"}</StatusBadge>
        <PlayerRowActions canDelete={canDelete} canEdit={canEdit} onAction={(action) => onAction(player, action)} player={player} />
      </div>
    </article>
  );
}

export default PlayerMobileCard;
