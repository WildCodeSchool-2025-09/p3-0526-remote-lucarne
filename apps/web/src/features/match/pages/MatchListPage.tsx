import { matchStyles } from "../matchStyles";
import { matchListQuerySchema, type AdminMatch } from "@lucarne/shared";
import { useQueries } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { getCurrentAppRole, hasRole, MATCH_WRITE_ROLES } from "../../../auth/authRole";
import DashboardListFilters from "../../../components/dashboard/DashboardListFilters";
import DashboardListPageHeader from "../../../components/dashboard/DashboardListPageHeader";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  LoadingState,
  Pagination,
  Select,
  temporaryIcons,
} from "../../../ui";
import { useSeasonDetail } from "../../season/hooks/useSeasonDetail";
import { seasonKeys } from "../../season/seasonKeys";
import { getSeason } from "../../../services/season.service";
import { useMatchList } from "../hooks/useMatches";
import { useMatchOptions } from "../hooks/useMatchOptions";
import { matchSchedule, matchScore, matchStatusLabels } from "../matchPresentation";

function MatchListPage() {
  const [search, setSearch] = useSearchParams();
  const parsed = matchListQuerySchema.safeParse(Object.fromEntries(search));
  const params = parsed.success ? parsed.data : matchListQuerySchema.parse({});
  const query = useMatchList(params, parsed.success);
  const options = useMatchOptions();
  const season = useSeasonDetail(params.seasonId ?? "");
  const contexts = useQueries({
    queries: Array.from(
      new Set(query.data?.data.map((match) => match.seasonId) ?? []),
    ).map((id) => ({
      queryKey: seasonKeys.detail(id),
      queryFn: () => getSeason(id),
      retry: false,
    })),
  });
  const canWrite = hasRole(getCurrentAppRole(), MATCH_WRITE_ROLES);
  const days =
    season.data?.leagueSeasons
      .filter((edition) => !params.leagueId || edition.leagueId === params.leagueId)
      .flatMap((edition) =>
        edition.matchdays.map((day) => ({ ...day, leagueName: edition.league.name })),
      ) ?? [];
  const change = (field: string, value: string) =>
    setSearch((current) => {
      const next = new URLSearchParams(current);

      next.delete("page");

      if (value) next.set(field, value);
      else next.delete(field);

      if (field === "seasonId" || field === "leagueId") next.delete("matchdayId");

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
  }, [query.isSuccess, query.data?.pagination.totalPages, params.page, setSearch]);

  const teamName = (id: string | null) =>
    id
      ? (options.teams.find((team) => team.id === id)?.name ?? "Équipe indisponible")
      : "Équipe à renseigner";
  const context = (match: AdminMatch) => {
    const data = contexts.find((item) => item.data?.id === match.seasonId)?.data;
    const day = data?.leagueSeasons
      .find((item) => item.id === match.leagueSeasonId)
      ?.matchdays.find((item) => item.id === match.matchdayId);

    return `${options.leagues.find((league) => league.id === match.leagueId)?.name ?? "Ligue"} · ${options.seasons.find((item) => item.id === match.seasonId)?.name ?? "Saison"}${day ? ` · Journée ${day.number}` : ""}`;
  };
  const title = (match: AdminMatch) =>
    `${teamName(match.homeTeamId)} – ${teamName(match.awayTeamId)}`;
  const selects = [
    { field: "leagueId", label: "Ligue", items: options.leagues },
    { field: "seasonId", label: "Saison", items: options.seasons },
    { field: "teamId", label: "Équipe", items: options.teams },
  ] as const;

  return (
    <section className={matchStyles.detailPage} aria-labelledby="match-list-title">
      <div className={matchStyles.container}>
        <DashboardListPageHeader
          canCreate={canWrite}
          count={query.data?.pagination.totalItems ?? 0}
          countLabel="matchs"
          createHref="/dashboard/matches/new"
          createLabel="Ajouter un match"
          description="Préparez les rencontres et suivez les résultats des calendriers ligue/saison."
          headingId="match-list-title"
          icon={temporaryIcons.matches}
          title="Matchs"
        />
        <DashboardListFilters
          activeCount={
            Array.from(search.keys()).filter(
              (key) => !["page", "sortOrder"].includes(key),
            ).length
          }
          label="Filtres des matchs"
          mobileAction={
            canWrite ? (
              <Link
                className={`
                  lucarne-button hidden! w-full self-stretch! justify-center
                  match-mobile:order-6 match-mobile:inline-flex!
                `}
                to="/dashboard/matches/new"
              >
                Ajouter un match
              </Link>
            ) : undefined
          }
        >
          {selects.map(({ field, label, items }) => (
            <label
              className={`${matchStyles.filterField} ${matchStyles.dashboardFilterField}`}
              key={field}
            >
              <span>{label}</span>
              <Select
                className="min-w-0 px-[10px]!"
                onChange={(event) => change(field, event.target.value)}
                value={search.get(field) ?? ""}
              >
                <option value="">
                  Toutes les{" "}
                  {label === "Équipe"
                    ? "équipes"
                    : label === "Ligue"
                      ? "ligues"
                      : "saisons"}
                </option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>
          ))}
          <label
            className={`${matchStyles.filterField} ${matchStyles.dashboardFilterField}`}
          >
            <span>Journée</span>
            <Select
              className="min-w-0 px-[10px]!"
              disabled={!params.seasonId || season.isPending}
              onChange={(event) => change("matchdayId", event.target.value)}
              value={search.get("matchdayId") ?? ""}
            >
              <option value="">Toutes les journées</option>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.leagueName} · Journée {day.number}
                </option>
              ))}
            </Select>
          </label>
          <label
            className={`${matchStyles.filterField} ${matchStyles.dashboardFilterField}`}
          >
            <span>État</span>
            <Select
              className="min-w-0 px-[10px]!"
              onChange={(event) => change("status", event.target.value)}
              value={search.get("status") ?? ""}
            >
              <option value="">Tous les états</option>
              {Object.entries(matchStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          {[
            { field: "dateFrom", label: "Du" },
            { field: "dateTo", label: "Au" },
          ].map(({ field, label }) => (
            <label
              className={`${matchStyles.filterField} ${matchStyles.dashboardFilterField}`}
              key={field}
            >
              <span>{label}</span>
              <Input
                onChange={(event) => change(field, event.target.value)}
                type="date"
                value={search.get(field) ?? ""}
              />
            </label>
          ))}
          <label
            className={`${matchStyles.filterField} ${matchStyles.dashboardFilterField}`}
          >
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
        </DashboardListFilters>
        {!parsed.success ? (
          <Alert>
            Les filtres sont invalides. Vérifiez les dates et les critères, ou
            réinitialisez-les.
          </Alert>
        ) : null}
        {options.isError ? (
          <Alert>
            Impossible de charger les noms des ligues, saisons ou équipes.{" "}
            <Button onClick={() => void options.reload()}>
              Réessayer les référentiels
            </Button>
          </Alert>
        ) : null}
        {contexts.some((item) => item.isError) ? (
          <Alert>
            Impossible de charger certaines journées.{" "}
            <Button
              onClick={() => {
                for (const item of contexts) void item.refetch();
              }}
            >
              Réessayer les calendriers
            </Button>
          </Alert>
        ) : null}
        {params.seasonId && season.isError ? (
          <Alert>
            Impossible de charger les journées.{" "}
            <Button onClick={() => void season.refetch()}>Réessayer les journées</Button>
          </Alert>
        ) : null}
        {parsed.success && query.isPending ? (
          <LoadingState>Chargement des matchs…</LoadingState>
        ) : null}
        {query.isError ? (
          <Alert>
            Impossible de charger les matchs.{" "}
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </Alert>
        ) : null}
        {query.isSuccess && parsed.success && query.data.data.length === 0 ? (
          <EmptyState>Aucun match ne correspond à vos critères.</EmptyState>
        ) : null}
        {query.isSuccess && parsed.success && query.data.data.length > 0 ? (
          <>
            <div className={matchStyles.tableWrapper}>
              <table className={matchStyles.table}>
                <caption className="sr-only">Liste des matchs</caption>
                <thead>
                  <tr>
                    <th scope="col">Rencontre</th>
                    <th scope="col">Calendrier</th>
                    <th scope="col">Programmation</th>
                    <th scope="col">État</th>
                    <th scope="col">Résultat</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((match) => (
                    <tr key={match.id}>
                      <td>
                        <Link
                          className={matchStyles.nameLink}
                          to={`/dashboard/matches/${match.id}`}
                        >
                          {title(match)}
                        </Link>
                        <p>{match.isPublished ? "Publié" : "Non publié"}</p>
                      </td>
                      <td>{context(match)}</td>
                      <td>{matchSchedule(match)}</td>
                      <td>{matchStatusLabels[match.status]}</td>
                      <td>{matchScore(match)}</td>
                      <td>
                        {canWrite ? (
                          <Link
                            className="lucarne-button lucarne-button--outline lucarne-button--sm"
                            to={`/dashboard/matches/${match.id}/edit`}
                          >
                            Modifier
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="hidden gap-3 match-compact:grid"
              role="list"
              aria-label="Liste des matchs sous forme de cartes"
            >
              {query.data.data.map((match) => (
                <article
                  className={`
                    rounded-[var(--radius-surface)] border
                    border-[var(--color-border-default)] p-5 [&_h2]:text-[1.1rem]
                    [&_p]:mx-0 [&_p]:my-2
                  `}
                  role="listitem"
                  key={match.id}
                >
                  <h2>
                    <Link to={`/dashboard/matches/${match.id}`}>{title(match)}</Link>
                  </h2>
                  <p>{context(match)}</p>
                  <p>{matchSchedule(match)}</p>
                  <p>
                    {matchStatusLabels[match.status]} ·{" "}
                    {match.isPublished ? "Publié" : "Non publié"}
                  </p>
                  <p>{matchScore(match)}</p>
                  {canWrite ? (
                    <Link to={`/dashboard/matches/${match.id}/edit`}>Modifier</Link>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : null}
        {query.isSuccess && parsed.success && query.data.pagination.totalPages > 0 ? (
          <Pagination
            label="Pagination des matchs"
            onPageChange={(page) => change("page", String(page))}
            page={params.page}
            totalPages={query.data.pagination.totalPages}
          />
        ) : null}
      </div>
    </section>
  );
}

export default MatchListPage;
