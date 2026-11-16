import { leagueSlugSchema } from "@lucarne/shared";
import { Link, Outlet, useLocation, useParams, useSearchParams } from "react-router";
import { Alert, Button, EmptyState, LoadingState } from "../../../ui";
import NotFoundPage from "../../../pages/NotFoundPage";
import { HttpError } from "../../../lib/httpClient";
import { usePublicLeague } from "../hooks/usePublicLeague";
import type { PublicLeagueContext } from "../hooks/usePublicLeagueContext";
import PublicLeagueHeader from "../components/PublicLeagueHeader";
import PublicLeagueSeasonSelect from "../components/PublicLeagueSeasonSelect";
import PublicLeagueTabs from "../components/PublicLeagueTabs";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import { publicNavigation } from "../../../components/public/publicRoutes";
import PublicShareButton from "../../../components/public/PublicShareButton";
import "../publicLeague.css";

function PublicLeagueRouteLayout() {
  const location = useLocation();
  const { leagueSlug = "" } = useParams();
  const [search, setSearch] = useSearchParams();
  const query = usePublicLeague(leagueSlug);
  if (!leagueSlugSchema.safeParse(leagueSlug).success) return <NotFoundPage />;
  if (query.isPending) return <div className="public-league-page"><LoadingState>Chargement de la ligue…</LoadingState></div>;
  if (query.isError && query.error instanceof HttpError && query.error.status === 404) return <NotFoundPage />;
  if (query.isError) return <div className="public-league-page"><Alert>
    Impossible de charger la ligue.
    <Button onClick={() => void query.refetch()} variant="outline">Réessayer</Button>
  </Alert></div>;
  const league = query.data;
  const requestedSeasonId = search.get("seasonId");
  const season = requestedSeasonId === null
    ? league.seasons.find((item) => item.isCurrent)
    : league.seasons.find((item) => item.id === requestedSeasonId);
  const invalidSeason = requestedSeasonId !== null && season === undefined;
  const seasonId = season?.id ?? "";
  const context: PublicLeagueContext = { league, seasonId };
  const section = location.pathname.endsWith("/teams") ? "Équipes" : location.pathname.endsWith("/matches") ? "Calendrier" : location.pathname.endsWith("/standings") ? "Classement" : location.pathname.endsWith("/statistics") ? "Statistiques" : undefined;
  const leaguePath = `${publicNavigation.league(league.slug)}${seasonId ? `?${new URLSearchParams({ seasonId })}` : ""}`;

  return <section aria-label={`Ligue ${league.name}`} className="public-league-page">
    <PublicBreadcrumb items={[{ label: "Ligues", to: publicNavigation.leagues }, { label: league.name, to: section ? leaguePath : undefined }, ...(section ? [{ label: section }] : [])]} />
    <PublicLeagueHeader league={league} />
    <PublicShareButton />
    <PublicLeagueSeasonSelect onChange={(id) => setSearch((current) => {
      const next = new URLSearchParams(current);
      next.set("seasonId", id);
      next.delete("page");
      return next;
    })} seasonId={seasonId} seasons={league.seasons} />
    {season ? <Link to={publicNavigation.season(season.id)}>Consulter la saison {season.name}</Link> : null}
    {league.seasons.length === 0 ? <EmptyState>Aucune saison n’est encore associée à cette ligue.</EmptyState> : null}
    {invalidSeason ? <Alert>Cette saison n’appartient pas à cette ligue. Choisissez une saison disponible.</Alert> : null}
    {!invalidSeason && league.seasons.length > 0 && !season ? <p role="status">
      Aucune saison courante n’est définie pour cette ligue. Choisissez une saison disponible.
    </p> : null}
    <PublicLeagueTabs leagueSlug={league.slug} seasonId={requestedSeasonId ?? seasonId} />
    <Outlet context={context} />
  </section>;
}

export default PublicLeagueRouteLayout;
