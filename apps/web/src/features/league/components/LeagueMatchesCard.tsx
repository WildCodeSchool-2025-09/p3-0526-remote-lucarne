import { useId } from "react";
import { Link } from "react-router";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { Alert, Button, EmptyState, LoadingState, temporaryIcons } from "../../../ui";
import { usePublicMatchList } from "../../match/hooks/usePublicMatches";
import LeagueMatchRow from "./LeagueMatchRow";

function LeagueMatchesCard({ leagueId, leagueSlug, seasonId, results = false, hasSeasons }: {
  leagueId: string;
  leagueSlug: string;
  seasonId: string;
  results?: boolean;
  hasSeasons: boolean;
}) {
  const titleId = useId();
  const title = results ? "Derniers résultats" : "Prochains matchs";
  const Icon = results ? temporaryIcons.leagues : temporaryIcons.calendar;
  const calendarSearch = new URLSearchParams({ seasonId });
  if (results) calendarSearch.set("status", "COMPLETED");
  if (results) calendarSearch.set("sortOrder", "desc");
  const calendar = `${publicNavigation.leagueCalendar(leagueSlug)}?${calendarSearch}`;
  // SCHEDULED is the project's sporting state "À venir". Civil schedules are
  // not converted to UTC instants or filtered using the browser's local clock.
  const query = usePublicMatchList({
    leagueId, seasonId: seasonId || undefined, page: 1, pageSize: 20,
    status: results ? "COMPLETED" : "SCHEDULED",
    sortBy: "matchDate", sortOrder: results ? "desc" : "asc",
  }, Boolean(seasonId));

  return <section aria-labelledby={titleId} className="public-league-card">
    <h2 id={titleId}>{title}</h2>
    {!seasonId ? <EmptyState>
      {hasSeasons ? "Choisissez une saison pour consulter les rencontres." : "Aucune rencontre disponible sans saison."}
    </EmptyState> : <>
      {query.isPending ? <LoadingState>{results ? "Chargement des résultats…" : "Chargement des prochains matchs…"}</LoadingState> : null}
      {query.isError ? <Alert>
        {results ? "Impossible de charger les résultats." : "Impossible de charger les prochains matchs."}
        <Button onClick={() => void query.refetch()} variant="outline">Réessayer</Button>
      </Alert> : null}
      {query.isSuccess && query.data.data.length === 0 ? <EmptyState>
        {results ? "Aucun résultat pour cette saison." : "Aucun prochain match pour cette saison."}
      </EmptyState> : null}
      {query.isSuccess && query.data.data.length > 0 ? <ul aria-label={title} className="public-league-matches">
        {query.data.data.slice(0, 3).map((match) => <LeagueMatchRow key={match.matchPublicId} match={match} results={results} returnTo={calendar} />)}
      </ul> : null}
    </>}
    {seasonId ? <footer>
      <Link className="lucarne-button lucarne-button--outline public-league-card__action" to={calendar}>
        <Icon aria-hidden="true" size={20} />
        {results ? "Voir les résultats" : "Voir le calendrier"}
      </Link>
    </footer> : null}
  </section>;
}

export default LeagueMatchesCard;
