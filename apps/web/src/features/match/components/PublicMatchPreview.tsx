import { useId } from "react";
import { Link } from "react-router";
import type { MatchListQuery, MatchStatus } from "@lucarne/shared";
import { Alert, Button, EmptyState, LoadingState } from "../../../ui";
import LeagueMatchRow from "../../league/components/LeagueMatchRow";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { usePublicMatchList } from "../hooks/usePublicMatches";

function PublicMatchPreview({ title, status, limit = 5, teamId }: { title: string; status: MatchStatus; limit?: number; teamId?: string }) {
  const titleId = useId();
  const results = status === "COMPLETED";
  const params: MatchListQuery = { page: 1, pageSize: 20, status, sortBy: "matchDate", sortOrder: results ? "desc" : "asc", ...(teamId ? { teamId } : {}) };
  const query = usePublicMatchList(params);
  const calendar = `${teamId ? publicNavigation.teamCalendar(teamId) : publicNavigation.calendar}?${new URLSearchParams({ status, sortOrder: params.sortOrder })}`;

  return <section aria-labelledby={titleId} className="public-league-card">
    <h2 id={titleId}>{title}</h2>
    {query.isPending ? <LoadingState>Chargement des rencontres…</LoadingState> : null}
    {query.isError ? <Alert>Impossible de charger les rencontres.
      <Button onClick={() => void query.refetch()} variant="outline">Réessayer</Button>
    </Alert> : null}
    {query.isSuccess && query.data.data.length === 0 ? <EmptyState>{results ? "Aucun résultat disponible pour le moment." : "Aucun prochain match publié pour le moment."}</EmptyState> : null}
    {query.isSuccess && query.data.data.length > 0 ? <ul aria-label={title} className="public-league-matches">
      {query.data.data.slice(0, limit).map((match) => <LeagueMatchRow key={match.matchPublicId} match={match} results={results} returnTo={calendar} />)}
    </ul> : null}
    <footer><Link className="lucarne-button lucarne-button--outline" to={calendar}>{results ? "Voir les résultats" : "Voir le calendrier"}</Link></footer>
  </section>;
}

export default PublicMatchPreview;
