import type { SeasonDetail } from "@lucarne/shared";
import { useState } from "react";
import { APP_ROLES, getCurrentAppRole, hasRole } from "../../../auth/authRole";
import { useTeamList } from "../../../hooks/useTeamList";
import { Alert, Button, ConfirmDialog, Select } from "../../../ui";
import { useCreateParticipation } from "../hooks/useCreateParticipation";
import { useParticipationWithdrawalPreview } from "../hooks/useParticipationWithdrawalPreview";
import { useWithdrawParticipation } from "../hooks/useWithdrawParticipation";

interface SeasonParticipationsProps {
  season: SeasonDetail;
}

function SeasonParticipations({ season }: SeasonParticipationsProps) {
  const role = getCurrentAppRole();
  const canManage = hasRole(role, [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR]);
  const teamsQuery = useTeamList({ page: 1, pageSize: 20, status: "ACTIVE", sortBy: "name", sortOrder: "asc" });
  const createMutation = useCreateParticipation(season.id);
  const previewMutation = useParticipationWithdrawalPreview();
  const withdrawMutation = useWithdrawParticipation();
  const [teamId, setTeamId] = useState("");
  const [pendingTeam, setPendingTeam] = useState<SeasonDetail["participatingTeams"][number] | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; variant: "danger" | "success" } | null>(null);

  if (!canManage) {
    return <ParticipationList season={season} />;
  }

  const registeredTeamIds = new Set(
    season.participatingTeams.filter((team) => team.status === "REGISTERED").map((team) => team.id),
  );
  const selectableTeams = teamsQuery.data?.data.filter((team) => !registeredTeamIds.has(team.id)) ?? [];

  const register = async () => {
    if (teamId === "") return;
    setFeedback(null);
    try {
      await createMutation.mutateAsync({ teamId });
      setTeamId("");
      setFeedback({ message: "L’équipe a été inscrite dans la saison.", variant: "success" });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "L’inscription est impossible.", variant: "danger" });
    }
  };

  const requestWithdrawal = async (team: SeasonDetail["participatingTeams"][number]) => {
    setFeedback(null);
    try {
      await previewMutation.mutateAsync({ seasonId: season.id, teamId: team.id });
      setPendingTeam(team);
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "La prévisualisation est impossible.", variant: "danger" });
    }
  };

  const confirmWithdrawal = async () => {
    if (!pendingTeam) return;
    try {
      const result = await withdrawMutation.mutateAsync({ seasonId: season.id, teamId: pendingTeam.id });
      setPendingTeam(null);
      setFeedback({
        message: result.scheduledMatchCount > 0
          ? `L’équipe a été retirée. ${result.scheduledMatchCount} match(s) planifié(s) sont conservé(s).`
          : "L’équipe a été retirée de la saison.",
        variant: "success",
      });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Le retrait est impossible.", variant: "danger" });
    }
  };

  const preview = previewMutation.data;

  return <>
    {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}
    <section className="league-detail-card" aria-labelledby="season-participation-title">
      <h2 id="season-participation-title">Équipes participantes</h2>
      <div className="create-league-form__fields">
        <label className="lucarne-form-field__label" htmlFor="participation-team">Inscrire une équipe</label>
        <Select id="participation-team" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
          <option value="">Sélectionner une équipe</option>
          {selectableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </Select>
        <Button disabled={teamId === "" || createMutation.isPending} onClick={() => void register()}>
          {createMutation.isPending ? "Inscription…" : "Inscrire"}
        </Button>
      </div>
      <ParticipationRows onWithdraw={(team) => { void requestWithdrawal(team); }} participatingTeams={season.participatingTeams} />
    </section>
    <ConfirmDialog
      actionLabel="Retirer l’équipe"
      onCancel={() => { if (!withdrawMutation.isPending) setPendingTeam(null); }}
      onConfirm={() => void confirmWithdrawal()}
      open={pendingTeam != null}
      pending={withdrawMutation.isPending}
      title="Retirer cette équipe de la saison ?"
      variant="danger"
    >
      {pendingTeam?.name} sera retirée. {preview?.scheduledMatchCount ?? 0} match(s) planifié(s) seront conservé(s).
    </ConfirmDialog>
  </>;
}

function ParticipationList({ season }: SeasonParticipationsProps) {
  return <section className="league-detail-card" aria-labelledby="season-participation-title">
    <h2 id="season-participation-title">Équipes participantes</h2>
    <ParticipationRows participatingTeams={season.participatingTeams} />
  </section>;
}

function ParticipationRows({
  onWithdraw,
  participatingTeams,
}: {
  onWithdraw?: (team: SeasonDetail["participatingTeams"][number]) => void;
  participatingTeams: SeasonDetail["participatingTeams"];
}) {
  if (participatingTeams.length === 0) return <p>Aucune équipe participante.</p>;
  return <ul>
    {participatingTeams.map((team) => <li key={team.id}>
      {team.name} — {team.status} — {team.points} point(s), rang {team.rank ?? "—"}, {team.scheduledMatchCount} match(s) planifié(s)
      {team.status === "REGISTERED" && onWithdraw ? <Button onClick={() => onWithdraw(team)} size="sm" variant="danger">Retirer</Button> : null}
    </li>)}
  </ul>;
}

export default SeasonParticipations;
