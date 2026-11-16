import { useSearchParams } from "react-router";
import PublicResourceState from "../../components/public/PublicResourceState";
import { EmptyState } from "../../ui";
import PublicEditionFilter from "../league/components/PublicEditionFilter";
import { usePublicPlayerStatistics } from "./usePublicStatistics";

export default function PublicPlayerStatisticsPanel({ playerId }: { playerId: string }) {
  const [search, setSearch] = useSearchParams();
  const leagueId = search.get("leagueId") ?? ""; const seasonId = search.get("seasonId") ?? "";
  const query = usePublicPlayerStatistics(playerId, { leagueId, seasonId });
  return <section className="public-league-card public-page-stack"><h2>Statistiques de la joueuse</h2>
    <div className="public-directory-filters"><PublicEditionFilter leagueId={leagueId} seasonId={seasonId} label=" des statistiques" onChange={(field, value) => setSearch((current) => {
      const next = new URLSearchParams(current); if (field === "leagueId") next.delete("seasonId"); if (value) next.set(field, value); else next.delete(field); return next;
    })} /></div>
    {!leagueId || !seasonId ? <EmptyState>Choisissez une ligue et une saison pour consulter les buts renseignés.</EmptyState> : <PublicResourceState query={query} label="Statistiques de la joueuse" />}
    {query.data ? <dl className="public-facts"><div><dt>Buts individuels renseignés</dt><dd>{query.data.goals}</dd></div></dl> : null}
    <p className="public-secondary-line">Les buts sont comptés à partir des événements GOAL des matchs terminés de l’édition choisie.</p>
  </section>;
}
