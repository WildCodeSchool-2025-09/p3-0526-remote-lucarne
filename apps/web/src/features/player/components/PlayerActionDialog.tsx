import { ConfirmDialog } from "../../../ui";
import { playerActionError } from "../utils/playerActionError";
import type { PlayerActionType } from "./PlayerRowActions";

const confirmationCopy: Record<
  PlayerActionType,
  { actionLabel: string; description: string; title: string }
> = {
  activate: {
    actionLabel: "Activer",
    description: "La joueuse sera réactivée. Aucune affectation ne sera créée.",
    title: "Activer cette joueuse ?",
  },
  deactivate: {
    actionLabel: "Désactiver",
    description:
      "La joueuse deviendra inactive. Toutes ses affectations et leurs dates seront conservées.",
    title: "Désactiver cette joueuse ?",
  },
  delete: {
    actionLabel: "Supprimer définitivement",
    description:
      "Cette suppression est définitive. Toutes les affectations de la joueuse et leurs dates seront également supprimées.",
    title: "Supprimer cette joueuse ?",
  },
};

interface PlayerActionDialogProps {
  action: PlayerActionType | null;
  error?: unknown;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function PlayerActionDialog({
  action,
  error,
  pending,
  onCancel,
  onConfirm,
}: PlayerActionDialogProps) {
  const confirmation = action === null ? null : confirmationCopy[action];

  return (
    <ConfirmDialog
      actionLabel={confirmation?.actionLabel}
      error={error == null ? undefined : playerActionError(error)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open={action !== null}
      pending={pending}
      title={confirmation?.title ?? "Confirmer l’action ?"}
      variant={action === "delete" ? "danger" : "primary"}
    >
      {confirmation?.description}
    </ConfirmDialog>
  );
}

export { PlayerActionDialog };
