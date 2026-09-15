import type { Team } from "@lucarne/shared";
import { ResourceActionsPopover } from "../../../ui";
import type { ResourceAction } from "../../../ui";

type TeamActionType = "activate" | "deactivate" | "delete";

interface TeamRowActionsProps {
  canDelete: boolean;
  canEdit: boolean;
  onAction: (action: TeamActionType) => void;
  team: Team;
}

function TeamRowActions({ canDelete, canEdit, onAction, team }: TeamRowActionsProps) {
  if (!canEdit) return null;

  const actionType: TeamActionType = team.isActive ? "deactivate" : "activate";
  const actions: ResourceAction[] = [
    { href: `/dashboard/teams/${team.id}/edit`, key: "edit", label: "Modifier" },
    {
      key: actionType,
      label: actionType === "deactivate" ? "Désactiver" : "Activer",
      onSelect: () => onAction(actionType),
    },
    ...(canDelete
      ? [{ key: "delete", label: "Supprimer", onSelect: () => onAction("delete"), tone: "danger" as const }]
      : []),
  ];

  return <ResourceActionsPopover actions={actions} triggerLabel={`Ouvrir les actions de ${team.name}`} />;
}

export default TeamRowActions;
export type { TeamActionType };
