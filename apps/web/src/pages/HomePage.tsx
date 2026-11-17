import { Link } from "react-router";
import { publicStyles } from "../components/public/publicStyles";
import { publicNavigation } from "../components/public/publicRoutes";
import { Alert, Button, EmptyState, LoadingState } from "../ui";
import { usePublicLeagueNavigation } from "../features/league/hooks/usePublicLeagueNavigation";
import PublicLeagueDirectory from "../features/league/components/PublicLeagueDirectory";
import PublicMatchPreview from "../features/match/components/PublicMatchPreview";
import "../features/league/publicLeague.css";

function HomePage() {
  const leagues = usePublicLeagueNavigation();

  return (
    <section className={`${publicStyles.page} public-page-stack`}>
      <header className="public-page-heading"><h1>Accueil</h1><p>Retrouvez les rencontres et les résultats des ligues féminines.</p></header>
      <div className="public-home-grid">
        <div className="public-page-stack">
          <PublicMatchPreview status="SCHEDULED" title="Prochains matchs" />
          <PublicMatchPreview status="COMPLETED" title="Derniers résultats" />
        </div>
        <aside aria-label="Les ligues" className="public-page-stack">
          <section aria-labelledby="home-leagues-title" className="public-league-card">
            <h2 id="home-leagues-title">Ligues</h2>
            {leagues.isPending ? <LoadingState>Chargement des ligues…</LoadingState> : null}
            {leagues.isError ? <Alert>Impossible de charger les ligues.
              <Button onClick={() => void leagues.refetch()} variant="outline">Réessayer</Button>
            </Alert> : null}
            {leagues.isSuccess && leagues.data.length === 0 ? <EmptyState>Aucune ligue active pour le moment.</EmptyState> : null}
            {leagues.data ? <PublicLeagueDirectory leagues={leagues.data.slice(0, 5)} /> : null}
            <Link className="lucarne-button lucarne-button--outline" to={publicNavigation.leagues}>Voir toutes les ligues</Link>
          </section>
        </aside>
      </div>
      <Link className="lucarne-button lucarne-button--outline" to={publicNavigation.calendar}>Consulter le calendrier des matchs</Link>
    </section>
  );
}

export default HomePage;
