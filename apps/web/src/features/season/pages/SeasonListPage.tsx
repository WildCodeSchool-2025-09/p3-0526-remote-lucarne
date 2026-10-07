import { seasonStyles } from "../seasonStyles";
import type { ListSeasonsParams } from "@lucarne/shared";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole } from "../../../auth/authRole";
import DashboardListPageHeader from "../../../components/dashboard/DashboardListPageHeader";
import {
  Alert,
  Button,
  EmptyState,
  LoadingState,
  Pagination,
  temporaryIcons,
} from "../../../ui";
import { useSeasonList } from "../hooks/useSeasonList";
import SeasonFilters from "../components/SeasonFilters";
import SeasonMobileCard from "../components/SeasonMobileCard";
import SeasonTable from "../components/SeasonTable";

function parseParams(searchParams: URLSearchParams): ListSeasonsParams {
  const page = Number(searchParams.get("page") ?? "1");

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: 20,
    search: searchParams.get("search") ?? undefined,
    sortBy: "startDate",
    sortOrder: "asc",
  };
}

function updateParams(
  current: URLSearchParams,
  changes: Partial<ListSeasonsParams>,
): URLSearchParams {
  const next = new URLSearchParams(current);

  for (const [key, value] of Object.entries(changes)) {
    if (value == null || value === "") next.delete(key);
    else next.set(key, String(value));
  }

  return next;
}

function SeasonListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const query = useSeasonList(params);
  const role = getCurrentAppRole();
  const canCreate = hasRole(role, [
    APP_ROLES.ADMIN,
    APP_ROLES.MODERATOR,
    APP_ROLES.EDITOR,
  ]);
  const canUpdate = canCreate;
  const setCriteria = (changes: Partial<ListSeasonsParams>) =>
    setSearchParams((current) =>
      updateParams(current, { ...changes, page: changes.page ?? 1 }),
    );

  useEffect(() => {
    const totalPages = query.data?.pagination.totalPages ?? 0;

    if (query.isSuccess && totalPages > 0 && (params.page ?? 1) > totalPages)
      setSearchParams((current) => updateParams(current, { page: totalPages }));
  }, [params.page, query.data?.pagination.totalPages, query.isSuccess, setSearchParams]);

  return (
    <section className={seasonStyles.detailPage} aria-labelledby="season-list-title">
      <div className={seasonStyles.container}>
        <DashboardListPageHeader
          canCreate={canCreate}
          count={query.data?.pagination.totalItems ?? 0}
          countLabel="saisons"
          createHref="/dashboard/seasons/new"
          createLabel="Ajouter une saison"
          description="Consultez les saisons et leurs ligues associées."
          headingId="season-list-title"
          icon={temporaryIcons.seasons}
          title="Saisons"
        />
        <SeasonFilters
          onChange={setCriteria}
          onReset={() => setSearchParams(new URLSearchParams())}
          params={params}
        />
        {query.isPending ? <LoadingState>Chargement des saisons…</LoadingState> : null}
        {query.isError ? (
          <div className="grid items-center justify-items-center gap-4 px-4 py-12 text-center">
            <Alert>Impossible de charger les saisons.</Alert>
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </div>
        ) : null}
        {query.isSuccess && query.data.data.length === 0 ? (
          <EmptyState>Aucune saison ne correspond à vos critères.</EmptyState>
        ) : null}
        {query.isSuccess && query.data.data.length > 0 ? (
          <>
            <SeasonTable canUpdate={canUpdate} seasons={query.data.data} />
            <div
              className="hidden gap-3 season-compact:grid"
              aria-label="Liste des saisons sous forme de cartes"
              role="list"
            >
              {query.data.data.map((season) => (
                <SeasonMobileCard canUpdate={canUpdate} key={season.id} season={season} />
              ))}
            </div>
          </>
        ) : null}
        {query.isSuccess && (query.data.pagination.totalPages ?? 0) > 0 ? (
          <Pagination
            label="Pagination des saisons"
            onPageChange={(page) => setCriteria({ page })}
            page={params.page ?? 1}
            totalPages={query.data.pagination.totalPages}
          />
        ) : null}
      </div>
    </section>
  );
}

export default SeasonListPage;
