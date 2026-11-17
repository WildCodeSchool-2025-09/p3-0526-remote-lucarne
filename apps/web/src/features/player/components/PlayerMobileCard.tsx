import { playerStyles } from "../playerStyles";
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

function PlayerMobileCard({
  canDelete,
  canEdit,
  onAction,
  player,
}: PlayerMobileCardProps) {
  const name = `${player.firstName} ${player.lastName}`;

  return (
    <article
      className="grid gap-4 rounded-[10px] bg-[var(--color-bg-subtle)] p-3"
      role="listitem"
    >
      <div className="flex items-center gap-3">
        <EntityAvatar imageUrl={player.pictureUrl} name={name} />
        <div>
          <Link className={playerStyles.nameLink} to={`/dashboard/players/${player.id}`}>
            {name}
          </Link>
          {player.activeTeam ? (
            <p className="mt-1 mb-0 text-[13px] text-[var(--color-text-secondary)]">
              {player.activeTeam.name}
            </p>
          ) : null}
          {player.position ? (
            <p className="mt-1 mb-0 text-[13px] text-[var(--color-text-secondary)]">
              {player.position}
            </p>
          ) : null}
          {player.nationality ? (
            <p className="mt-1 mb-0 text-[13px] text-[var(--color-text-secondary)]">
              {player.nationality}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className={`
        flex items-center justify-between player-compact:[&_.resource-actions-popover]:ml-auto
        player-compact:[&_.resource-actions-popover__trigger]:border!
        player-compact:[&_.resource-actions-popover__trigger]:border-[var(--color-action-primary)]!
        player-compact:[&_.resource-actions-popover__trigger]:text-[var(--color-text-success)]!
        player-compact:[&_.resource-actions-popover__trigger]:min-w-[104px]!
        player-compact:[&_.resource-actions-popover__icon]:hidden!
        player-compact:[&_.resource-actions-popover__mobile-label]:inline!
      `}
      >
        <StatusBadge variant={player.isActive ? "active" : "inactive"}>
          {player.isActive ? "Active" : "Inactive"}
        </StatusBadge>
        <PlayerRowActions
          canDelete={canDelete}
          canEdit={canEdit}
          onAction={(action) => onAction(player, action)}
          player={player}
        />
      </div>
    </article>
  );
}

export default PlayerMobileCard;
