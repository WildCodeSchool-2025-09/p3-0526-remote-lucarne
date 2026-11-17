import { Link } from "react-router";
import { EmptyState } from "../../ui";
import PublicResourceState from "../../components/public/PublicResourceState";
import { publicNavigation } from "../../components/public/publicRoutes";
import PublicStandingsTable from "./PublicStandingsTable";
import { usePublicStandings } from "./usePublicStatistics";

export default function PublicLeagueStandingsPanel({ slug, seasonId, preview = false }: { slug: string; seasonId: string; preview?: boolean }) {
  const query = usePublicStandings(slug, seasonId);
  return <section className="public-league-card"><h2>Classement</h2>
    {!seasonId ? <EmptyState>Choisissez une saison pour consulter le classement.</EmptyState> : <PublicResourceState query={query} label="Classement" />}
    {query.data ? <>{query.data.rows.length ? <PublicStandingsTable rows={preview ? query.data.rows.slice(0, 5) : query.data.rows} caption={`Classement ${query.data.league.name} — ${query.data.season.name}`} compact={preview} /> : <EmptyState>Aucune équipe inscrite dans cette édition.</EmptyState>}
      {!preview ? <p className="public-secondary-line">Victoire : 3 points · Nul : 1 point · Défaite : 0 point. Départage : différence de buts, buts marqués, nom. La forme présente les cinq derniers résultats, du plus récent au plus ancien.</p> : <Link to={`${publicNavigation.leagueStandings(slug)}?${new URLSearchParams({ seasonId })}`}>Voir le classement complet</Link>}
    </> : null}
  </section>;
}
