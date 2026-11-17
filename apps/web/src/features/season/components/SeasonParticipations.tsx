import { seasonStyles } from "../seasonStyles";
import type { LeagueSeasonDetail } from "@lucarne/shared";
import { useId, useState } from "react";
import { APP_ROLES, getCurrentAppRole, hasRole } from "../../../auth/authRole";
import { useTeamList } from "../../../hooks/useTeamList";
import { Alert, Button, ConfirmDialog, EntityLogo, Select } from "../../../ui";
import { formatDateTime } from "../../../lib/dateTimeFormat";
import { useCreateParticipation } from "../hooks/useCreateParticipation";
import { useParticipationWithdrawalPreview } from "../hooks/useParticipationWithdrawalPreview";
import { useWithdrawParticipation } from "../hooks/useWithdrawParticipation";

interface ParticipationListProps {
  season: LeagueSeasonDetail;
}

interface SeasonParticipationsProps extends ParticipationListProps {
  seasonName: string;
}

function SeasonParticipations({ season, seasonName }: SeasonParticipationsProps) {
  const controlId = useId();
  const role = getCurrentAppRole();
  const canManage = hasRole(role, [
    APP_ROLES.ADMIN,
    APP_ROLES.MODERATOR,
    APP_ROLES.EDITOR,
  ]);
  const teamsQuery = useTeamList({
    page: 1,
    pageSize: 20,
    status: "ACTIVE",
    sortBy: "name",
    sortOrder: "asc",
  });
  const createMutation = useCreateParticipation(season.id);
  const previewMutation = useParticipationWithdrawalPreview();
  const withdrawMutation = useWithdrawParticipation();
  const [teamId, setTeamId] = useState("");
  const [pendingTeam, setPendingTeam] = useState<
    LeagueSeasonDetail["participatingTeams"][number] | null
  >(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    variant: "danger" | "success";
  } | null>(null);

  if (!canManage) {
    return <ParticipationList season={season} />;
  }

  const registeredTeamIds = new Set(
    season.participatingTeams
      .filter((team) => team.status === "REGISTERED")
      .map((team) => team.id),
  );
  const selectableTeams =
    teamsQuery.data?.data.filter((team) => !registeredTeamIds.has(team.id)) ?? [];

  const register = async () => {
    if (teamId === "") return;

    setFeedback(null);

    try {
      await createMutation.mutateAsync({ teamId });

      setTeamId("");

      setFeedback({
        message: "L’équipe a été inscrite dans la saison.",
        variant: "success",
      });
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "L’inscription est impossible.",
        variant: "danger",
      });
    }
  };

  const requestWithdrawal = async (
    team: LeagueSeasonDetail["participatingTeams"][number],
  ) => {
    setFeedback(null);

    try {
      await previewMutation.mutateAsync({ leagueSeasonId: season.id, teamId: team.id });

      setPendingTeam(team);
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "La prévisualisation est impossible.",
        variant: "danger",
      });
    }
  };

  const confirmWithdrawal = async () => {
    if (!pendingTeam) return;

    try {
      const result = await withdrawMutation.mutateAsync({
        leagueSeasonId: season.id,
        teamId: pendingTeam.id,
      });

      setPendingTeam(null);

      setFeedback({
        message:
          result.scheduledMatchCount > 0
            ? `L’équipe a été retirée. ${result.scheduledMatchCount} match(s) planifié(s) sont conservé(s).`
            : "L’équipe a été retirée de la saison.",
        variant: "success",
      });
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "Le retrait est impossible.",
        variant: "danger",
      });
    }
  };

  const preview = previewMutation.data;

  return (
    <>
      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}
      <section className={seasonStyles.detailCard}>
        <h4>Équipes participantes</h4>
        <div className={seasonStyles.formFields}>
          {teamsQuery.isError ? (
            <Alert>Impossible de charger les équipes disponibles.</Alert>
          ) : null}
          <label className="lucarne-form-field__label" htmlFor={controlId}>
            Inscrire une équipe
          </label>
          <Select
            id={controlId}
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="">Sélectionner une équipe</option>
            {selectableTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
          <Button
            disabled={
              teamId === "" ||
              createMutation.isPending ||
              teamsQuery.isPending ||
              teamsQuery.isError
            }
            onClick={() => void register()}
          >
            {createMutation.isPending ? "Inscription…" : "Inscrire"}
          </Button>
        </div>
        <ParticipationRows
          withdrawalPending={previewMutation.isPending || withdrawMutation.isPending}
          onWithdraw={(team) => {
            void requestWithdrawal(team);
          }}
          participatingTeams={season.participatingTeams}
        />
      </section>
      <ConfirmDialog
        actionLabel="Retirer l’équipe"
        error={feedback?.variant === "danger" ? feedback.message : undefined}
        onCancel={() => {
          if (!withdrawMutation.isPending) setPendingTeam(null);
        }}
        onConfirm={() => void confirmWithdrawal()}
        open={pendingTeam != null}
        pending={withdrawMutation.isPending}
        title="Retirer cette équipe de la saison ?"
        variant="danger"
      >
        La participation de « {pendingTeam?.name} » à la ligue « {season.league.name} »
        pour la saison « {seasonName} » sera retirée. L’équipe reste dans le répertoire.
        Ses matchs, leurs résultats et l’historique de participation seront conservés.{" "}
        {preview?.scheduledMatchCount ?? 0} match(s) planifié(s) seront conservé(s).
      </ConfirmDialog>
    </>
  );
}

export function ParticipationList({ season }: ParticipationListProps) {
  const headingId = useId();

  return (
    <section className={seasonStyles.detailCard} aria-labelledby={headingId}>
      <h3 id={headingId}>Équipes participantes</h3>
      {season.participatingTeams.length === 0 ? (
        <p>Aucune équipe participante.</p>
      ) : (
        <ul>
          {season.participatingTeams.map((team) => (
            <li key={team.id}>
              <div className="flex items-center gap-3">
                <EntityLogo logoUrl={team.logoUrl} name={team.name} />
                <h4>{team.name}</h4>
              </div>
              <dl>
                <div>
                  <dt>Statut</dt>
                  <dd>{team.status === "REGISTERED" ? "Inscrite" : "Retirée"}</dd>
                </div>
                <div>
                  <dt>Date d’inscription</dt>
                  <dd>{formatDateTime(team.registrationAt)}</dd>
                </div>
                <div>
                  <dt>Points</dt>
                  <dd>{team.points}</dd>
                </div>
                <div>
                  <dt>Rang</dt>
                  <dd>{team.rank ?? "Non renseigné"}</dd>
                </div>
                <div>
                  <dt>Matchs planifiés</dt>
                  <dd>{team.scheduledMatchCount}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ParticipationRows({
  onWithdraw,
  participatingTeams,
  withdrawalPending = false,
}: {
  onWithdraw?: (team: LeagueSeasonDetail["participatingTeams"][number]) => void;
  participatingTeams: LeagueSeasonDetail["participatingTeams"];
  withdrawalPending?: boolean;
}) {
  if (participatingTeams.length === 0) return <p>Aucune équipe participante.</p>;

  return (
    <ul>
      {participatingTeams.map((team) => (
        <li key={team.id}>
          {team.name} — {team.status} — {team.points} point(s), rang {team.rank ?? "—"},{" "}
          {team.scheduledMatchCount} match(s) planifié(s)
          {team.status === "REGISTERED" && onWithdraw ? (
            <Button
              disabled={withdrawalPending}
              onClick={() => onWithdraw(team)}
              size="sm"
              variant="danger"
            >
              Retirer
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default SeasonParticipations;
