import type { League } from "@lucarne/shared";
import { ResourceActionsPopover } from "../../../ui";
import type { ResourceAction } from "../../../ui";
import { getStatus } from "../utils/leagueList";

type LeagueActionType = "activate" | "deactivate" | "delete";

interface LeagueRowActionsProps {
  canDelete: boolean;
  canEdit: boolean;
  league: League;
  onAction: (action: LeagueActionType) => void;
}

function LeagueRowActions({ canDelete, canEdit, league, onAction }: LeagueRowActionsProps) {
  if (!canEdit) return null;

  const actionType: LeagueActionType = getStatus(league) === "ACTIVE" ? "deactivate" : "activate";
  const actions: ResourceAction[] = [
    {
      href: `/dashboard/leagues/${league.id}/edit`,
      key: "edit",
      label: "Modifier",
    },
    {
      key: actionType,
      label: actionType === "deactivate" ? "Désactiver" : "Activer",
      onSelect: () => onAction(actionType),
    },
    ...(canDelete
      ? [{
        key: "delete",
        label: "Supprimer",
        onSelect: () => onAction("delete"),
        tone: "danger" as const,
      }]
      : []),
  ];

  return (
    <ResourceActionsPopover
      actions={actions}
      triggerLabel={`Ouvrir les actions de ${league.name}`}
    />
  );
}

export default LeagueRowActions;
export type { LeagueActionType };
