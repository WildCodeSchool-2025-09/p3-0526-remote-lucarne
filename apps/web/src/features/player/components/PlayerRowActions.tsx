import type { Player } from "@lucarne/shared";
import { ResourceActionsPopover } from "../../../ui";
import type { ResourceAction } from "../../../ui";

type PlayerActionType = "activate" | "deactivate" | "delete";

interface PlayerRowActionsProps {
  canDelete: boolean;
  canEdit: boolean;
  onAction: (action: PlayerActionType) => void;
  player: Player;
}

function PlayerRowActions({ canDelete, canEdit, onAction, player }: PlayerRowActionsProps) {
  if (!canEdit) return null;
  const actionType: PlayerActionType = player.isActive ? "deactivate" : "activate";
  const actions: ResourceAction[] = [
    { href: `/dashboard/players/${player.id}/edit`, key: "edit", label: "Modifier" },
    { key: actionType, label: actionType === "deactivate" ? "Désactiver" : "Activer", onSelect: () => onAction(actionType) },
    ...(canDelete ? [{ key: "delete", label: "Supprimer", onSelect: () => onAction("delete"), tone: "danger" as const }] : []),
  ];
  return <ResourceActionsPopover actions={actions} triggerLabel={`Ouvrir les actions de ${player.firstName} ${player.lastName}`} />;
}

export default PlayerRowActions;
export type { PlayerActionType };
