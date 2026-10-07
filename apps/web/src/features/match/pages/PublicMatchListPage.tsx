import { matchStyles } from "../matchStyles";
import { matchListQuerySchema } from "@lucarne/shared";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  LoadingState,
  Pagination,
  Select,
} from "../../../ui";
import PublicMatchBreadcrumb from "../components/PublicMatchBreadcrumb";
import PublicMatchCard from "../components/PublicMatchCard";
import { usePublicMatchList } from "../hooks/usePublicMatches";
import { matchStatusLabels } from "../matchPresentation";

function PublicMatchListPage() {
  const [search, setSearch] = useSearchParams();
  const parsed = matchListQuerySchema.safeParse(Object.fromEntries(search));
  const params = parsed.success ? parsed.data : matchListQuerySchema.parse({});
  const query = usePublicMatchList(params, parsed.success);
  const change = (field: string, value: string) =>
    setSearch((current) => {
      const next = new URLSearchParams(current);

      next.delete("page");

      if (value) next.set(field, value);
      else next.delete(field);

      return next;
    });

  useEffect(() => {
    const total = query.data?.pagination.totalPages ?? 0;

    if (query.isSuccess && total > 0 && params.page > total)
      setSearch((current) => {
        const next = new URLSearchParams(current);

        next.set("page", String(total));

        return next;
      });
  }, [query.data?.pagination.totalPages, query.isSuccess, params.page, setSearch]);

  return (
    <section className={matchStyles.publicPage} aria-labelledby="public-matches-title">
      <PublicMatchBreadcrumb />
      <h1 id="public-matches-title">Calendrier des matchs</h1>
      <p>
        Retrouvez les rencontres et les résultats. Les horaires sont affichés à l’heure de
        Paris.
      </p>
      <div
        className={`
          flex flex-wrap items-end gap-4 rounded-[var(--radius-surface)] border
          border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5
          match-mobile:flex-col match-mobile:items-stretch match-mobile:p-4
        `}
        role="search"
        aria-label="Filtres des matchs"
      >
        <label className={matchStyles.filterField}>
          <span>État</span>
          <Select
            className="min-w-0 px-[10px]!"
            onChange={(event) => change("status", event.target.value)}
            value={search.get("status") ?? ""}
          >
            <option value="">Tous les états</option>
            {Object.entries(matchStatusLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        {[
          { field: "dateFrom", label: "Du" },
          { field: "dateTo", label: "Au" },
        ].map(({ field, label }) => (
          <label className={matchStyles.filterField} key={field}>
            <span>{label}</span>
            <Input
              type="date"
              onChange={(event) => change(field, event.target.value)}
              value={search.get(field) ?? ""}
            />
          </label>
        ))}
        <label className={matchStyles.filterField}>
          <span>Ordre des dates</span>
          <Select
            className="min-w-0 px-[10px]!"
            onChange={(event) => change("sortOrder", event.target.value)}
            value={params.sortOrder}
          >
            <option value="asc">Croissant</option>
            <option value="desc">Décroissant</option>
          </Select>
        </label>
        <Button
          className={matchStyles.resetButton}
          onClick={() => setSearch(new URLSearchParams())}
          variant="outline"
        >
          Réinitialiser
        </Button>
      </div>
      {!parsed.success ? (
        <Alert>
          Les filtres sont invalides. Vérifiez la période ou réinitialisez les critères.
        </Alert>
      ) : null}
      {parsed.success && query.isPending ? (
        <LoadingState>Chargement des matchs…</LoadingState>
      ) : null}
      {parsed.success && query.isError ? (
        <Alert>
          Impossible de charger les matchs.
          <Button onClick={() => void query.refetch()}>Réessayer</Button>
        </Alert>
      ) : null}
      {parsed.success && query.isSuccess ? (
        <>
          <p role="status">
            {query.data.pagination.totalItems} match
            {query.data.pagination.totalItems > 1 ? "s" : ""}
          </p>
          {query.data.data.length === 0 ? (
            <EmptyState>Aucun match ne correspond à vos critères.</EmptyState>
          ) : (
            <div
              className="my-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5"
              role="list"
              aria-label="Matchs publiés"
            >
              {query.data.data.map((match) => (
                <PublicMatchCard key={match.matchPublicId} match={match} />
              ))}
            </div>
          )}
          {query.data.pagination.totalPages > 0 ? (
            <Pagination
              label="Pagination des matchs"
              onPageChange={(page) => change("page", String(page))}
              page={params.page}
              totalPages={query.data.pagination.totalPages}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default PublicMatchListPage;
