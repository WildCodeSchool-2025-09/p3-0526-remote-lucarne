import type { CreatePlayerAssignmentInput } from "@lucarne/shared";
import { useState } from "react";
import { useTeamList } from "../../../hooks/useTeamList";
import { useCreatePlayerAssignment } from "../../../hooks/usePlayer";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, FormField, Input } from "../../../ui";

const today = () => new Date().toISOString().slice(0, 10);

function assignmentError(error: unknown): string {
  if (error instanceof HttpError && error.code === "ASSIGNMENT_ALREADY_PLANNED") return "Une affectation est déjà planifiée pour ce joueur.";
  if (error instanceof HttpError && error.code === "TEAM_INACTIVE") return "Cette équipe est inactive.";
  return "Impossible de planifier l’affectation.";
}

function CreatePlayerAssignmentForm({ playerId, onSuccess, onCancel }: { playerId: string; onSuccess: () => void; onCancel: () => void }) {
  const mutation = useCreatePlayerAssignment();
  const teams = useTeamList({ page: 1, pageSize: 20, status: "ACTIVE", sortBy: "name", sortOrder: "asc" });
  const [teamId, setTeamId] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    if (!teamId || !joinedAt) { setValidationError("L’équipe et la date de début sont obligatoires."); return; }
    if (joinedAt < today()) { setValidationError("La date de début ne peut pas être antérieure à aujourd’hui."); return; }
    const input: CreatePlayerAssignmentInput = { teamId, joinedAt, shirtNumber: shirtNumber ? Number(shirtNumber) : null };
    mutation.mutate({ id: playerId, input }, { onSuccess });
  };

  return <form className="create-team-form" noValidate onSubmit={submit}>
    <h2 className="create-team-form__title">Planifier une affectation</h2>
    <div className="create-team-form__fields">
      <FormField htmlFor="player-assignment-team" label="Équipe" required>
        <select disabled={teams.isPending || mutation.isPending} id="player-assignment-team" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
          <option value="">Sélectionner une équipe</option>
          {teams.data?.data.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        {teams.isError ? <Alert variant="danger">Impossible de charger les équipes.</Alert> : null}
      </FormField>
      <FormField htmlFor="player-assignment-joined-at" label="Date de début" required>
        <Input disabled={mutation.isPending} id="player-assignment-joined-at" min={today()} type="date" value={joinedAt} onChange={(event) => setJoinedAt(event.target.value)} />
      </FormField>
      <FormField htmlFor="player-assignment-shirt-number" label="Numéro de maillot">
        <Input disabled={mutation.isPending} id="player-assignment-shirt-number" min="1" max="99" type="number" value={shirtNumber} onChange={(event) => setShirtNumber(event.target.value)} />
      </FormField>
    </div>
    {validationError || mutation.isError ? <Alert variant="danger">{validationError ?? assignmentError(mutation.error)}</Alert> : null}
    <div className="create-team-form__actions">
      <Button disabled={mutation.isPending} onClick={onCancel} type="button" variant="ghost">Annuler</Button>
      <Button disabled={mutation.isPending} type="submit" variant="primary">{mutation.isPending ? "Planification…" : "Planifier"}</Button>
    </div>
  </form>;
}

export { CreatePlayerAssignmentForm };
