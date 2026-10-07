import { assignmentDatesSchema } from "@lucarne/shared/schemas";
import { useState } from "react";
import { Alert, Button, FormField, Input } from "../../ui";

type AssignmentDateFormProps = {
  assignment: { id: string; joinedAt: string; leftAt: string | null };
  pending: boolean;
  onClose: () => void;
  onSubmit: (dates: { joinedAt: string; leftAt: string | null }) => Promise<unknown>;
};

function AssignmentDateForm({
  assignment,
  onClose,
  onSubmit,
  pending,
}: AssignmentDateFormProps) {
  const [joinedAt, setJoinedAt] = useState(assignment.joinedAt);
  const [leftAt, setLeftAt] = useState(assignment.leftAt ?? "");
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = assignmentDatesSchema.safeParse({ joinedAt, leftAt: leftAt || null });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Vérifiez les dates.");

      return;
    }

    try {
      await onSubmit({
        joinedAt: result.data.joinedAt,
        leftAt: result.data.leftAt ?? null,
      });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Impossible de modifier l’affectation.",
      );
    }
  };
  const prefix = `assignment-${assignment.id}`;

  return (
    <form noValidate onSubmit={(event) => void submit(event)}>
      <FormField htmlFor={`${prefix}-joined`} label="Date de début" required>
        <Input
          disabled={pending}
          id={`${prefix}-joined`}
          type="date"
          value={joinedAt}
          onChange={(event) => setJoinedAt(event.target.value)}
        />
      </FormField>
      <FormField htmlFor={`${prefix}-left`} label="Date de fin (incluse)">
        <Input
          disabled={pending}
          id={`${prefix}-left`}
          type="date"
          value={leftAt}
          onChange={(event) => setLeftAt(event.target.value)}
        />
      </FormField>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button disabled={pending} type="button" variant="ghost" onClick={onClose}>
        Annuler
      </Button>
      <Button disabled={pending} type="submit">
        Enregistrer les dates
      </Button>
    </form>
  );
}

export { AssignmentDateForm };
