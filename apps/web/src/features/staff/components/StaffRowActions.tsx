import type { StaffMember } from "@lucarne/shared";
import { ResourceActionsPopover } from "../../../ui";
import type { ResourceAction } from "../../../ui";

type StaffActionType = "activate" | "deactivate" | "delete";
interface StaffRowActionsProps { canDelete: boolean; canEdit: boolean; onAction: (action: StaffActionType) => void; staffMember: StaffMember; }

function StaffRowActions({ canDelete, canEdit, onAction, staffMember }: StaffRowActionsProps) {
  if (!canEdit) return null;
  const actionType: StaffActionType = staffMember.isActive ? "deactivate" : "activate";
  const actions: ResourceAction[] = [
    { href: `/dashboard/staff-members/${staffMember.id}/edit`, key: "edit", label: "Modifier" },
    { key: actionType, label: actionType === "deactivate" ? "Désactiver" : "Activer", onSelect: () => onAction(actionType) },
    ...(canDelete ? [{ key: "delete", label: "Supprimer", onSelect: () => onAction("delete"), tone: "danger" as const }] : []),
  ];
  return <ResourceActionsPopover actions={actions} triggerLabel={`Ouvrir les actions de ${staffMember.firstName} ${staffMember.lastName}`} />;
}

export default StaffRowActions;
export type { StaffActionType };
