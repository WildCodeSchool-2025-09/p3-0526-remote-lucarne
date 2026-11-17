import { publicLeagueTeamsQuerySchema } from "@lucarne/shared";
import { useEffect, useId } from "react";
import { useSearchParams } from "react-router";
import { Alert, Button, EmptyState, LoadingState, Pagination } from "../../../ui";
import { HttpError } from "../../../lib/httpClient";
import { usePublicLeagueContext } from "../hooks/usePublicLeagueContext";
import { usePublicLeagueTeams } from "../hooks/usePublicLeagueTeams";
import PublicLeagueTeamsList from "../components/PublicLeagueTeamsList";

function PublicLeagueTeamsPage() {
  const { league, seasonId } = usePublicLeagueContext();
  const [search, setSearch] = useSearchParams();
  const titleId = useId();
  const parsed = publicLeagueTeamsQuerySchema.safeParse({ page: search.get("page") ?? undefined });
  const params = parsed.success ? parsed.data : publicLeagueTeamsQuerySchema.parse({});
  const query = usePublicLeagueTeams(league.slug, seasonId, params, parsed.success);
  const changePage = (page: number) => setSearch((current) => {
    const next = new URLSearchParams(current);
    next.set("page", String(page));
    return next;
  });

  useEffect(() => {
    if (!parsed.success || !query.isSuccess) return;
    const lastPage = Math.max(query.data.pagination.totalPages, 1);
    if (params.page <= lastPage) return;
    setSearch((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(lastPage));
      return next;
    }, { replace: true });
  }, [params.page, parsed.success, query.isSuccess, query.data?.pagination.totalPages, setSearch]);

  return <section aria-labelledby={titleId} className="public-league-card">
    <h2 id={titleId}>Équipes</h2>
    {!seasonId ? <EmptyState>
      {league.seasons.length > 0 ? "Choisissez une saison pour consulter les équipes." : "Aucune équipe disponible sans saison."}
    </EmptyState> : !parsed.success ? <Alert>
      Le numéro de page est invalide.
      <Button onClick={() => changePage(1)} variant="outline">Revenir à la première page</Button>
    </Alert> : <>
      {query.isPending ? <LoadingState>Chargement des équipes…</LoadingState> : null}
      {query.isError ? <Alert>
        {query.error instanceof HttpError && query.error.status === 404
          ? "Cette saison n’est plus disponible pour cette ligue."
          : "Impossible de charger les équipes."}
        <Button onClick={() => void query.refetch()} variant="outline">Réessayer</Button>
      </Alert> : null}
      {query.data?.data.length === 0 ? <EmptyState>Aucune équipe active inscrite pour cette saison.</EmptyState> : null}
      {query.data && query.data.data.length > 0 ? <PublicLeagueTeamsList teams={query.data.data} /> : null}
      {query.data && query.data.pagination.totalPages > 1 ? <Pagination
        label="Pagination des équipes" onPageChange={changePage} page={params.page} totalPages={query.data.pagination.totalPages}
      /> : null}
    </>}
  </section>;
}

export default PublicLeagueTeamsPage;
