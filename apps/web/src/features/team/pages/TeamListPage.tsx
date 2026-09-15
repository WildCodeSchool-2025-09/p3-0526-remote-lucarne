import type { ListTeamsParams, Team } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole, TEAM_EDIT_ROLES } from "../../../auth/authRole";
import DashboardListPageHeader from "../../../components/dashboard/DashboardListPageHeader";
import { useTeamList } from "../../../hooks/useTeamList";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, ConfirmDialog, EmptyState, LoadingState, Pagination, temporaryIcons } from "../../../ui";
import TeamFilters from "../components/TeamFilters";
import TeamMobileCard from "../components/TeamMobileCard";
import { type TeamActionType } from "../components/TeamRowActions";
import TeamTable from "../components/TeamTable";
import { useTeamMutation } from "../hooks/useTeamMutation";
import { parseParams, updateParams } from "../utils/teamList";

interface PendingAction {
  team: Team;
  type: TeamActionType;
}

function getFriendlyError(error: unknown): string {
  if (error instanceof HttpError && error.status === 404) return "Cette équipe n’existe plus ou a déjà été supprimée.";
  if (error instanceof HttpError && error.status === 403) return "Vous n’êtes pas autorisé à effectuer cette action.";
  return "L’équipe n’a pas pu être modifiée. Veuillez réessayer.";
}

function TeamListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const query = useTeamList(params);
  const mutation = useTeamMutation();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const role = getCurrentAppRole();
  const canEdit = hasRole(role, TEAM_EDIT_ROLES);
  const canCreate = canEdit;
  const canDelete = role === APP_ROLES.ADMIN;
  const totalPages = query.data?.pagination.totalPages ?? 0;
  const isFiltered = Boolean(params.search) || params.status !== "ALL";
  const teamNames = query.data?.data.map((team) => team.name) ?? [];

  const setCriteria = (changes: Partial<ListTeamsParams>) => {
    setSearchParams((current) => updateParams(current, { ...changes, page: changes.page ?? 1 }));
  };

  const resetCriteria = () => setSearchParams(new URLSearchParams());

  useEffect(() => {
    if (query.isSuccess && totalPages > 0 && (params.page ?? 1) > totalPages) {
      setSearchParams((current) => updateParams(current, { page: totalPages }));
    }
  }, [params.page, query.isSuccess, setSearchParams, totalPages]);

  const requestAction = (team: Team, type: TeamActionType) => {
    setPendingAction({ team, type });
    setFeedback(null);
  };

  const confirmAction = async () => {
    if (pendingAction == null) return;

    const action = pendingAction;
    try {
      await mutation.mutateAsync({ action: action.type, id: action.team.id });
      setPendingAction(null);
      setFeedback({
        type: "success",
        message: action.type === "delete"
          ? "L’équipe a été supprimée."
          : action.type === "deactivate"
            ? "L’équipe a été désactivée."
            : "L’équipe a été activée.",
      });

      const currentPage = params.page ?? 1;
      if (action.type === "delete" && query.data?.data.length === 1 && currentPage > 1) {
        setSearchParams((current) => updateParams(current, { page: currentPage - 1 }));
      }
    } catch (error) {
      setPendingAction(null);
      setFeedback({ type: "error", message: getFriendlyError(error) });
    }
  };

  return (
    <section aria-labelledby="team-list-title" className="dashboard-list-page">
      <div className="dashboard-list-page__container">
        <DashboardListPageHeader
          canCreate={canCreate}
          count={query.data?.pagination.totalItems ?? 0}
          countLabel="équipes"
          createHref="/dashboard/teams/new"
          createLabel="Ajouter une équipe"
          description="Consulter et gérer les équipes."
          headingId="team-list-title"
          icon={temporaryIcons.teams}
          title="Équipes"
        />

        {feedback ? <Alert variant={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</Alert> : null}

        <TeamFilters
          canCreate={canCreate}
          onChange={setCriteria}
          onReset={resetCriteria}
          params={params}
          teamNames={teamNames}
        />

        {query.isPending ? <LoadingState>Chargement des équipes…</LoadingState> : null}
        {query.isError ? (
          <div className="dashboard-list__state">
            <Alert>Impossible de charger les équipes. Veuillez réessayer.</Alert>
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </div>
        ) : null}

        {query.isSuccess && query.data.data.length === 0 ? (
          <EmptyState action={isFiltered ? <Button onClick={resetCriteria} variant="outline">Réinitialiser les critères</Button> : undefined}>
            {isFiltered ? "Aucune équipe ne correspond à vos critères." : "Aucune équipe n’est disponible."}
          </EmptyState>
        ) : null}

        {query.isSuccess && query.data.data.length > 0 ? (
          <>
            <TeamTable canDelete={canDelete} canEdit={canEdit} onAction={requestAction} teams={query.data.data} />
            <div aria-label="Liste des équipes sous forme de cartes" className="dashboard-list-cards" role="list">
              {query.data.data.map((team) => (
                <TeamMobileCard
                  canDelete={canDelete}
                  canEdit={canEdit}
                  key={team.id}
                  onAction={requestAction}
                  team={team}
                />
              ))}
            </div>
          </>
        ) : null}

        {query.isSuccess && totalPages > 0 ? (
          <Pagination
            label="Pagination des équipes"
            onPageChange={(page) => setCriteria({ page })}
            page={params.page ?? 1}
            totalPages={totalPages}
          />
        ) : null}
      </div>

      <ConfirmDialog
        actionLabel="Confirmer"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmAction()}
        open={pendingAction != null}
        pending={mutation.isPending}
        title={pendingAction?.type === "deactivate"
          ? "Désactiver l’équipe ?"
          : pendingAction?.type === "activate"
            ? "Activer l’équipe ?"
            : "Supprimer définitivement l’équipe ?"}
        variant={pendingAction?.type === "delete" ? "danger" : "primary"}
      >
        {pendingAction?.type === "deactivate"
          ? `${pendingAction.team.name} deviendra inactive et restera consultable.`
          : pendingAction?.type === "activate"
            ? `${pendingAction.team.name} redeviendra active.`
            : pendingAction == null
              ? undefined
              : `${pendingAction.team.name} sera supprimée définitivement.`}
      </ConfirmDialog>
    </section>
  );
}

export default TeamListPage;
