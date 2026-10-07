import { playerStyles } from "../playerStyles";
import { createPlayerAssignmentInputSchema } from "@lucarne/shared";
import { useState } from "react";
import { useTeamList } from "../../../hooks/useTeamList";
import { useCreatePlayerAssignment } from "../../../hooks/usePlayer";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, FormField, Input } from "../../../ui";

function CreatePlayerAssignmentForm({
  playerId,
  onSuccess,
  onCancel,
}: {
  playerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const mutation = useCreatePlayerAssignment();
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
  const [shirtNumber, setShirtNumber] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = createPlayerAssignmentInputSchema.safeParse({
      teamId,
      joinedAt,
      ...(leftAt ? { leftAt } : {}),
      shirtNumber: shirtNumber ? Number(shirtNumber) : null,
    });

    if (!result.success) {
      setValidationError(
        result.error.issues[0]?.message ?? "Vérifiez les dates et l’équipe.",
      );

      return;
    }

    setValidationError(null);
    mutation.mutate({ id: playerId, input: result.data }, { onSuccess });
  };
  const error =
    mutation.error instanceof HttpError
      ? mutation.error.message
      : "Impossible d’ajouter l’affectation.";

  return (
    <form className={playerStyles.formCard} noValidate onSubmit={submit}>
      <h2>Ajouter une affectation</h2>
      <div className={playerStyles.formFields}>
        <FormField htmlFor="player-assignment-team" label="Équipe" required>
          <select
            className={playerStyles.select}
            disabled={teams.isPending || mutation.isPending}
            id="player-assignment-team"
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
        <FormField htmlFor="player-assignment-joined-at" label="Date de début" required>
          <Input
            disabled={mutation.isPending}
            id="player-assignment-joined-at"
            type="date"
            value={joinedAt}
            onChange={(event) => setJoinedAt(event.target.value)}
          />
        </FormField>
        <FormField htmlFor="player-assignment-left-at" label="Date de fin (incluse)">
          <Input
            disabled={mutation.isPending}
            id="player-assignment-left-at"
            type="date"
            value={leftAt}
            onChange={(event) => setLeftAt(event.target.value)}
          />
        </FormField>
        <FormField htmlFor="player-assignment-shirt-number" label="Numéro de maillot">
          <Input
            disabled={mutation.isPending}
            id="player-assignment-shirt-number"
            min="1"
            max="99"
            type="number"
            value={shirtNumber}
            onChange={(event) => setShirtNumber(event.target.value)}
          />
        </FormField>
      </div>
      {validationError || mutation.isError ? (
        <Alert variant="danger">{validationError ?? error}</Alert>
      ) : null}
      <div className={playerStyles.formActions}>
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

export { CreatePlayerAssignmentForm };
