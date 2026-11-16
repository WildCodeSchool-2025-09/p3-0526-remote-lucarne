import { matchStyles } from "../matchStyles";
import { matchListQuerySchema } from "@lucarne/shared";
import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router";
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
import PublicShareButton from "../../../components/public/PublicShareButton";
import LeagueMatchRow from "../../league/components/LeagueMatchRow";
import { formatDate } from "../../../lib/dateFormat";
import PublicMatchResourceFilters from "../components/PublicMatchResourceFilters";
import type { PublicMatchScope } from "../components/PublicMatchResourceFilters";

function PublicMatchListPage({ scope }: { scope?: PublicMatchScope }) {
  const location = useLocation();
  const [search, setSearch] = useSearchParams();
  const parsed = matchListQuerySchema.safeParse({
    ...Object.fromEntries(search),
    ...(scope ?? {}),
  });
  const params = parsed.success ? parsed.data : matchListQuerySchema.parse({});
  const hasContext = !scope || Boolean(scope.teamId || scope.matchdayId || scope.seasonId);
  const query = usePublicMatchList(params, parsed.success && hasContext);
  const change = (field: string, value: string) =>
    setSearch((current) => {
      const next = new URLSearchParams(current);

      next.delete("page");
      if (field === "leagueId") { next.delete("seasonId"); next.delete("matchdayId"); next.delete("teamId"); }
      if (field === "seasonId") { next.delete("matchdayId"); next.delete("teamId"); }

      if (value) next.set(field, value);
      else next.delete(field);

      return next;
    });

  useEffect(() => {
    const total = query.data?.pagination.totalPages ?? 0;

    if (query.isSuccess && params.page > Math.max(total, 1))
      setSearch((current) => {
        const next = new URLSearchParams(current);

        next.set("page", String(Math.max(total, 1)));

        return next;
      });
  }, [query.data?.pagination.totalPages, query.isSuccess, params.page, setSearch]);

  return (
    <section className={scope ? "public-page-stack" : `${matchStyles.publicPage} public-page-stack`} aria-labelledby="public-matches-title">
      {!scope ? <PublicMatchBreadcrumb /> : null}
      {scope ? <h2 id="public-matches-title">Calendrier des matchs</h2> : <header className="public-resource-header"><h1 id="public-matches-title">Calendrier des matchs</h1><PublicShareButton /></header>}
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
        <PublicMatchResourceFilters params={params} scope={scope} onChange={change} />
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
          onClick={() => setSearch(scope?.seasonId ? new URLSearchParams({ seasonId: scope.seasonId }) : new URLSearchParams())}
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
      {!hasContext ? <EmptyState>Choisissez une saison pour consulter le calendrier.</EmptyState> : null}
      {hasContext && parsed.success && query.isPending ? (
        <LoadingState>Chargement des matchs…</LoadingState>
      ) : null}
      {hasContext && parsed.success && query.isError ? (
        <Alert>
          Impossible de charger les matchs.
          <Button onClick={() => void query.refetch()}>Réessayer</Button>
        </Alert>
      ) : null}
      {hasContext && parsed.success && query.isSuccess ? (
        <>
          <p role="status">
            {query.data.pagination.totalItems} match
            {query.data.pagination.totalItems > 1 ? "s" : ""}
          </p>
          {query.data.data.length === 0 ? (
            <EmptyState>Aucun match ne correspond à vos critères.</EmptyState>
          ) : scope ? (
            <div aria-label="Matchs publiés" className="public-page-stack">
              {[...new Set(query.data.data.map((match) => match.matchDate))].map((date) => <section className="public-league-card" key={date}>
                <h3>{formatDate(date)}</h3>
                <ul aria-label={`Matchs du ${formatDate(date)}`} className="public-league-matches">
                  {query.data.data.filter((match) => match.matchDate === date).map((match) => <LeagueMatchRow
                    key={match.matchPublicId} match={match} results={match.status !== "SCHEDULED"} showStatus
                    returnTo={`${location.pathname}${location.search}`} />)}
                </ul>
              </section>)}
            </div>
          ) : (
            <div
              className="my-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5"
              role="list"
              aria-label="Matchs publiés"
            >
              {query.data.data.map((match) => (
                <PublicMatchCard key={match.matchPublicId} match={match} returnTo={`${location.pathname}${location.search}`} />
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
