import type { ListSeasonsParams, Season } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole } from "../../../auth/authRole";
import DashboardListPageHeader from "../../../components/dashboard/DashboardListPageHeader";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, EmptyState, LoadingState, Pagination, temporaryIcons } from "../../../ui";
import { useSetCurrentSeason } from "../hooks/useSetCurrentSeason";
import { useSeasonList } from "../hooks/useSeasonList";
import SeasonFilters from "../components/SeasonFilters";
import SeasonMobileCard from "../components/SeasonMobileCard";
import SeasonTable from "../components/SeasonTable";

function parseParams(searchParams: URLSearchParams): ListSeasonsParams {
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page") ?? "1");
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: 20,
    search: searchParams.get("search") ?? undefined,
    status: status === "CURRENT" || status === "INACTIVE" ? status : "ALL",
    sortBy: "startDate",
    sortOrder: "asc",
  };
}

function updateParams(current: URLSearchParams, changes: Partial<ListSeasonsParams>): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value == null || value === "" || (key === "status" && value === "ALL")) next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}

function SeasonListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const query = useSeasonList(params);
  const role = getCurrentAppRole();
  const canUpdate = role === APP_ROLES.ADMIN || role === APP_ROLES.EDITOR;
  const canSetCurrent = role === APP_ROLES.ADMIN;
  const canCreate = hasRole(role, [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR]);
  const setCurrentMutation = useSetCurrentSeason();
  const [feedback, setFeedback] = useState<string | null>(null);

  const setCriteria = (changes: Partial<ListSeasonsParams>) => setSearchParams((current) => updateParams(updateParams(current, changes), { page: 1 }));
  const requestCurrent = async (season: Season) => {
    try {
      await setCurrentMutation.mutateAsync({ leagueId: season.leagueId, seasonId: season.id });
      setFeedback("La saison courante a été mise à jour.");
    } catch (error) {
      setFeedback(error instanceof HttpError ? error.message : "La saison courante n’a pas pu être mise à jour.");
    }
  };

  useEffect(() => {
    const totalPages = query.data?.pagination.totalPages ?? 0;
    if (query.isSuccess && totalPages > 0 && (params.page ?? 1) > totalPages) setSearchParams((current) => updateParams(current, { page: totalPages }));
  }, [params.page, query.data?.pagination.totalPages, query.isSuccess, setSearchParams]);

  return (
    <section className="dashboard-list-page" aria-labelledby="season-list-title"><div className="dashboard-list-page__container">
      <DashboardListPageHeader canCreate={canCreate} count={query.data?.pagination.totalItems ?? 0} countLabel="saisons" createHref="/dashboard/seasons/new" createLabel="Ajouter une saison" description="Consulter et gérer les saisons." headingId="season-list-title" icon={temporaryIcons.seasons} title="Saisons" />
      {feedback ? <Alert variant="success">{feedback}</Alert> : null}
      <SeasonFilters onChange={setCriteria} onReset={() => setSearchParams(new URLSearchParams())} params={params} />
      {query.isPending ? <LoadingState>Chargement des saisons…</LoadingState> : null}
      {query.isError ? <div className="dashboard-list__state"><Alert>Impossible de charger les saisons.</Alert><Button onClick={() => void query.refetch()}>Réessayer</Button></div> : null}
      {query.isSuccess && query.data.data.length === 0 ? <EmptyState>Aucune saison ne correspond à vos critères.</EmptyState> : null}
      {query.isSuccess && query.data.data.length > 0 ? <><SeasonTable canSetCurrent={canSetCurrent} canUpdate={canUpdate} onSetCurrent={requestCurrent} seasons={query.data.data} /><div className="dashboard-list-cards" aria-label="Liste des saisons sous forme de cartes" role="list">{query.data.data.map((season) => <SeasonMobileCard canSetCurrent={canSetCurrent} canUpdate={canUpdate} key={season.id} onSetCurrent={requestCurrent} season={season} />)}</div></> : null}
      {query.isSuccess && (query.data.pagination.totalPages ?? 0) > 0 ? <Pagination label="Pagination des saisons" onPageChange={(page) => setCriteria({ page })} page={params.page ?? 1} totalPages={query.data.pagination.totalPages} /> : null}
    </div></section>
  );
}

export default SeasonListPage;
