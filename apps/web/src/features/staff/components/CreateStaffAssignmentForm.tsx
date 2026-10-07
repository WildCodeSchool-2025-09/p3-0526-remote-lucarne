import { staffStyles } from "../staffStyles";
import { createStaffAssignmentInputSchema } from "@lucarne/shared";
import { useState } from "react";
import { useTeamList } from "../../../hooks/useTeamList";
import { useCreateStaffAssignment } from "../../../hooks/useStaff";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, FormField, Input } from "../../../ui";

function CreateStaffAssignmentForm({
  staffMemberId,
  onSuccess,
  onCancel,
}: {
  staffMemberId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const mutation = useCreateStaffAssignment();
  const [page, setPage] = useState(1);
  const teams = useTeamList({
    page,
    pageSize: 20,
    status: "ALL",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [teamId, setTeamId] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [leftAt, setLeftAt] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createStaffAssignmentInputSchema.safeParse({
      teamId,
      joinedAt,
      ...(leftAt ? { leftAt } : {}),
      jobTitle,
    });
    if (!result.success) {
      setValidationError(
        result.error.issues[0]?.message ?? "Vérifiez les dates et l’équipe.",
      );
      return;
    }
    setValidationError(null);
    mutation.mutate({ id: staffMemberId, input: result.data }, { onSuccess });
  };
  const error =
    mutation.error instanceof HttpError
      ? mutation.error.message
      : "Impossible d’ajouter l’affectation.";
  return (
    <form className={staffStyles.formCard} noValidate onSubmit={submit}>
      <h2>Ajouter une affectation</h2>
      <div className={staffStyles.formFields}>
        <FormField htmlFor="staff-assignment-team" label="Équipe" required>
          <select
            className={staffStyles.select}
            disabled={teams.isPending || mutation.isPending}
            id="staff-assignment-team"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="">Sélectionner une équipe</option>
            {teams.data?.data.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
                {team.isActive === false ? " (inactive — historique uniquement)" : ""}
              </option>
            ))}
          </select>
        </FormField>
        {teams.isError ? (
          <Alert variant="danger">Impossible de charger les équipes.</Alert>
        ) : null}
        {(teams.data?.pagination?.totalPages ?? 1) > 1 ? (
          <div>
            <Button
              disabled={page === 1 || mutation.isPending}
              type="button"
              onClick={() => setPage(page - 1)}
            >
              Équipes précédentes
            </Button>
            <Button
              disabled={page === teams.data?.pagination.totalPages || mutation.isPending}
              type="button"
              onClick={() => setPage(page + 1)}
            >
              Équipes suivantes
            </Button>
          </div>
        ) : null}
        <FormField htmlFor="staff-assignment-joined-at" label="Date de début" required>
          <Input
            disabled={mutation.isPending}
            id="staff-assignment-joined-at"
            type="date"
            value={joinedAt}
            onChange={(event) => setJoinedAt(event.target.value)}
          />
        </FormField>
        <FormField htmlFor="staff-assignment-left-at" label="Date de fin (incluse)">
          <Input
            disabled={mutation.isPending}
            id="staff-assignment-left-at"
            type="date"
            value={leftAt}
            onChange={(event) => setLeftAt(event.target.value)}
          />
        </FormField>
        <FormField
          htmlFor="staff-assignment-job-title"
          label="Intitulé de poste"
          required
        >
          <Input
            disabled={mutation.isPending}
            id="staff-assignment-job-title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
          />
        </FormField>
      </div>
      {validationError || mutation.isError ? (
        <Alert variant="danger">{validationError ?? error}</Alert>
      ) : null}
      <div className={staffStyles.formActions}>
        <Button
          disabled={mutation.isPending}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          Annuler
        </Button>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Ajout…" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
export { CreateStaffAssignmentForm };
