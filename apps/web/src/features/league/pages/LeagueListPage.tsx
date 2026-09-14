import type { League, ListLeaguesParams } from "@lucarne/shared";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { canCreateLeague, canDeleteLeague, canViewLeague, getCurrentAppRole } from "../../../auth/authRole";
import { Alert, Button, ConfirmDialog, EmptyState, LoadingState, Pagination } from "../../../ui";
import { HttpError } from "../../../lib/httpClient";
import LeagueFilters from "../components/LeagueFilters";
import LeagueMobileCard from "../components/LeagueMobileCard";
import LeaguePageHeader from "../components/LeaguePageHeader";
import { type LeagueActionType } from "../components/LeagueRowActions";
import LeagueTable from "../components/LeagueTable";
import { useLeagueCountries } from "../hooks/useLeagueCountries";
import { useLeagueList } from "../hooks/useLeagueList";
import { useLeagueMutation } from "../hooks/useLeagueMutation";
import { parseParams, updateParams } from "../utils/leagueList";

interface PendingAction {
  league: League;
  type: LeagueActionType;
}

function getFriendlyError(error: unknown, fallback: string): string {
  if (error instanceof HttpError && error.status === 404 && error.code === "RESOURCE_NOT_FOUND") {
    return "Cette ligue n’existe plus ou a déjà été supprimée.";
  }

  if (error instanceof HttpError && error.status === 403) {
    return "Vous n’êtes pas autorisé à effectuer cette action.";
  }

  if (error instanceof HttpError && error.code === "LEAGUE_DELETION_BLOCKED") {
    return error.details?.map((detail) => detail.message).join(" ")
      || "La suppression est bloquée par des dépendances.";
  }

  return fallback;
}

function LeagueListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const query = useLeagueList(params);
  const countriesQuery = useLeagueCountries();
  const mutation = useLeagueMutation();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const role = getCurrentAppRole();
  const canDelete = canDeleteLeague(role);
  const canCreate = canCreateLeague(role);
  const canEdit = canViewLeague(role);

  const countryOptions = useMemo(() => {
    const countries = new Set([...(params.countries ?? []), ...(countriesQuery.data ?? [])]);

    return [...countries].sort((left, right) => left.localeCompare(right, "fr"));
  }, [countriesQuery.data, params.countries]);

  const setCriteria = (changes: Partial<ListLeaguesParams> & { countries?: string[] }) => {
    setSearchParams((current) => updateParams(current, { ...changes, page: changes.page ?? 1 }));
  };

  const resetCriteria = () => setSearchParams(new URLSearchParams());
  const totalPages = query.data?.pagination.totalPages ?? 0;
  const isFiltered = Boolean(params.search) || params.status !== "ALL" || (params.countries?.length ?? 0) > 0;
  const leagueNames = query.data?.data.map((league) => league.name) ?? [];

  useEffect(() => {
    if (query.isSuccess && totalPages > 0 && (params.page ?? 1) > totalPages) {
      setSearchParams((current) => updateParams(current, { page: totalPages }));
    }
  }, [params.page, query.isSuccess, setSearchParams, totalPages]);

  const requestAction = (league: League, type: LeagueActionType) => {
    setPendingAction({ league, type });
    setFeedback(null);
  };

  const confirmAction = async () => {
    if (pendingAction == null) return;

    const action = pendingAction;
    try {
      await mutation.mutateAsync({ action: action.type, id: action.league.id });
      setPendingAction(null);
      setFeedback({
        type: "success",
        message: action.type === "deactivate"
          ? "La ligue a été désactivée."
          : action.type === "activate"
            ? "La ligue a été activée."
            : "La ligue a été supprimée.",
      });

      const currentPage = params.page ?? 1;
      if (action.type === "delete" && query.data?.data.length === 1 && currentPage > 1) {
        setSearchParams((current) => updateParams(current, { page: currentPage - 1 }));
      }
    } catch (error) {
      setPendingAction(null);
      setFeedback({
        type: "error",
        message: getFriendlyError(error, "La ligue n’a pas pu être modifiée. Veuillez réessayer."),
      });
    }
  };

  return (
    <section className="league-list-page" aria-labelledby="league-list-title">
      <div className="league-list-page__container">
        <LeaguePageHeader canCreate={canCreate} leagueCount={query.data?.pagination.totalItems ?? 0} />

        {feedback ? <Alert variant={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</Alert> : null}

        <LeagueFilters
          countries={countryOptions}
          leagueNames={leagueNames}
          onChange={setCriteria}
          onReset={resetCriteria}
          params={params}
        />

        {query.isPending ? <LoadingState>Chargement des ligues…</LoadingState> : null}
        {query.isError ? (
          <div className="league-list__state">
            <Alert>Impossible de charger les ligues. Veuillez réessayer.</Alert>
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </div>
        ) : null}

        {query.isSuccess && query.data.data.length === 0 ? (
          <EmptyState action={isFiltered ? <Button onClick={resetCriteria} variant="outline">Réinitialiser les critères</Button> : undefined}>
            {isFiltered ? "Aucune ligue ne correspond à vos critères." : "Aucune ligue n’est disponible."}
          </EmptyState>
        ) : null}

        {query.isSuccess && query.data.data.length > 0 ? (
          <>
            <LeagueTable canDelete={canDelete} canEdit={canEdit} leagues={query.data.data} onAction={requestAction} />
            <div aria-label="Liste mobile des ligues" className="league-mobile-cards">
              {query.data.data.map((league) => (
                <LeagueMobileCard
                  canDelete={canDelete}
                  canEdit={canEdit}
                  key={league.id}
                  league={league}
                  onAction={requestAction}
                />
              ))}
            </div>
          </>
        ) : null}

        {query.isSuccess && totalPages > 0 ? (
          <Pagination
            onPageChange={(page) => setCriteria({ page, countries: params.countries })}
            page={params.page ?? 1}
            totalPages={totalPages}
            label="Pagination des ligues"
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
          ? "Désactiver la ligue ?"
          : pendingAction?.type === "activate"
            ? "Activer la ligue ?"
            : "Supprimer définitivement la ligue ?"}
        variant={pendingAction?.type === "delete" ? "danger" : "primary"}
      >
        {pendingAction?.type === "deactivate"
          ? `${pendingAction.league.name} deviendra inactive et restera consultable.`
          : pendingAction?.type === "activate"
            ? `${pendingAction.league.name} redeviendra active.`
            : pendingAction == null
              ? undefined
              : `${pendingAction.league.name} sera supprimée définitivement. Cette action est irréversible et sera refusée si des saisons associées existent.`}
      </ConfirmDialog>
    </section>
  );
}

export default LeagueListPage;
