import { publicStatisticsQuerySchema } from "@lucarne/shared";
import { useSearchParams } from "react-router";
import { Alert, Button, EmptyState } from "../../ui";
import PublicResourceState from "../../components/public/PublicResourceState";
import { usePublicPageBounds } from "../../components/public/usePublicPageBounds";
import { usePublicLeagueStatistics } from "./usePublicStatistics";
import PublicScorers from "./PublicScorers";

export default function PublicLeagueStatisticsPanel({ slug, seasonId, preview = false }: { slug: string; seasonId: string; preview?: boolean }) {
  const [search, setSearch] = useSearchParams();
  const parsed = publicStatisticsQuerySchema.safeParse(preview ? { limit: 5 } : { page: search.get("page") ?? 1 });
  const query = usePublicLeagueStatistics(slug, seasonId, parsed.success ? parsed.data : { page: 1, limit: 20 }, parsed.success);
  usePublicPageBounds(preview ? 1 : parsed.success ? parsed.data.page : 1, !preview ? query.data?.scorers.pagination.totalPages : undefined, setSearch);
  return <section className="public-league-card public-page-stack"><h2>Statistiques</h2>
    {!seasonId ? <EmptyState>Choisissez une saison pour consulter les statistiques.</EmptyState> : !parsed.success ? <Alert>La page demandée est invalide. <Button variant="outline" onClick={() => setSearch((current) => { const next = new URLSearchParams(current); next.delete("page"); return next; })}>Réinitialiser la pagination</Button></Alert> : <PublicResourceState query={query} label="Statistiques" />}
    {parsed.success && seasonId && query.data ? <><dl className="public-facts">
      <div><dt>Matchs terminés</dt><dd>{query.data.completedMatches}</dd></div><div><dt>Buts marqués</dt><dd>{query.data.totalGoals}</dd></div><div><dt>Buts par match</dt><dd>{query.data.goalsPerMatch === null ? "Aucun match terminé" : new Intl.NumberFormat("fr", { maximumFractionDigits: 2 }).format(query.data.goalsPerMatch)}</dd></div>
      {!preview ? <><div><dt>Victoires à domicile</dt><dd>{query.data.homeWins}</dd></div><div><dt>Matchs nuls</dt><dd>{query.data.draws}</dd></div><div><dt>Victoires à l’extérieur</dt><dd>{query.data.awayWins}</dd></div></> : null}
    </dl><PublicScorers scorers={query.data.scorers} onPageChange={!preview ? (page) => setSearch((current) => { const next = new URLSearchParams(current); next.set("page", String(page)); return next; }) : undefined} /></> : null}
  </section>;
}
