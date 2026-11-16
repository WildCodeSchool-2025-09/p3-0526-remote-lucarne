import { publicTeamQuerySchema } from "@lucarne/shared";
import { Link, useSearchParams } from "react-router";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import PublicResourceState from "../../../components/public/PublicResourceState";
import { usePublicPageBounds } from "../../../components/public/usePublicPageBounds";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { Alert, Button, EmptyState, Input, Pagination, Select } from "../../../ui";
import PublicLeagueLogo from "../../league/components/PublicLeagueLogo";
import { usePublicLeagueNavigation } from "../../league/hooks/usePublicLeagueNavigation";
import { usePublicTeams } from "../hooks/usePublicTeams";

export default function PublicTeamListPage() {
  const [search, setSearch] = useSearchParams();
  const parsed = publicTeamQuerySchema.safeParse(Object.fromEntries(search));
  const params = parsed.success ? parsed.data : publicTeamQuerySchema.parse({});
  const query = usePublicTeams(params, parsed.success);
  const leagues = usePublicLeagueNavigation();
  usePublicPageBounds(params.page, query.data?.pagination.totalPages, setSearch);
  const change = (key: string, value: string) => setSearch((current) => {
    const next = new URLSearchParams(current); next.delete("page");
    if (key === "leagueId") next.delete("seasonId");
    if (value) next.set(key, value); else next.delete(key);
    return next;
  });
  return <section className="public-resource-page public-page-stack">
    <PublicBreadcrumb items={[{ label: "Équipes" }]} /><h1>Équipes</h1>
    <div className="public-directory-filters" role="search" aria-label="Filtres des équipes">
      <label className="public-search-field"><span>Rechercher une équipe</span><Input type="search" maxLength={100} value={search.get("search") ?? ""} onChange={(event) => change("search", event.target.value)} /></label>
      <label className="public-search-field"><span>Ligue</span><Select value={search.get("leagueId") ?? ""} onChange={(event) => change("leagueId", event.target.value)}>
        <option value="">Toutes les ligues</option>{leagues.data?.map((league) => <option key={league.id} value={league.id}>{league.name} · {league.country}</option>)}
      </Select></label>
      <Button variant="outline" onClick={() => setSearch({})}>Réinitialiser</Button>
    </div>
    {!parsed.success ? <Alert>Les filtres sont invalides. Réinitialisez les critères.</Alert> : <PublicResourceState query={query} label="Équipes" />}
    {parsed.success && query.data ? <><p role="status">{query.data.pagination.total} équipe{query.data.pagination.total > 1 ? "s" : ""}</p>
      {query.data.data.length ? <ul className="public-league-teams" aria-label="Équipes disponibles">
        {query.data.data.map((team) => <li key={team.id}><Link className="public-league-team" to={publicNavigation.team(team.id)}><PublicLeagueLogo name={team.name} logoUrl={team.logoUrl} /><span>{team.name}<small className="public-secondary-line">{team.stadium ?? "Stade non renseigné"}</small></span></Link></li>)}
      </ul> : <EmptyState>Aucune équipe ne correspond à vos critères.</EmptyState>}
      {query.data.pagination.totalPages > 0 ? <Pagination label="Pagination des équipes" page={params.page} totalPages={query.data.pagination.totalPages} onPageChange={(page) => change("page", String(page))} /> : null}
    </> : null}
  </section>;
}
