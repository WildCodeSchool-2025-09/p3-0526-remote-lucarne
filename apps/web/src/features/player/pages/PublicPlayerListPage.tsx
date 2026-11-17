import { publicPlayerQuerySchema } from "@lucarne/shared";
import { Link, useSearchParams } from "react-router";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import PublicResourceState from "../../../components/public/PublicResourceState";
import { usePublicPageBounds } from "../../../components/public/usePublicPageBounds";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { Alert, Button, EmptyState, Input, Pagination } from "../../../ui";
import PublicLeagueLogo from "../../league/components/PublicLeagueLogo";
import { usePublicPlayers } from "../usePublicPlayers";
import PublicTeamFilter from "../../team/components/PublicTeamFilter";

export default function PublicPlayerListPage() {
  const [search, setSearch] = useSearchParams();
  const parsed = publicPlayerQuerySchema.safeParse(Object.fromEntries(search));
  const params = parsed.success ? parsed.data : publicPlayerQuerySchema.parse({});
  const query = usePublicPlayers(params, parsed.success);
  usePublicPageBounds(params.page, query.data?.pagination.totalPages, setSearch);
  const change = (key: string, value: string) => setSearch((current) => {
    const next = new URLSearchParams(current); next.delete("page");
    if (value) next.set(key, value); else next.delete(key);
    return next;
  });
  return <section className="public-resource-page public-page-stack">
    <PublicBreadcrumb items={[{ label: "Joueuses" }]} /><h1>Joueuses</h1>
    <div className="public-directory-filters" role="search" aria-label="Filtres des joueuses">
      <label className="public-search-field"><span>Rechercher une joueuse</span><Input type="search" maxLength={100} value={search.get("search") ?? ""} onChange={(event) => change("search", event.target.value)} /></label>
      <label className="public-search-field"><span>Poste exact</span><Input maxLength={50} value={search.get("position") ?? ""} onChange={(event) => change("position", event.target.value)} /></label>
      <PublicTeamFilter teamId={params.teamId} onChange={(value) => change("teamId", value)} />
      <Button variant="outline" onClick={() => setSearch({})}>Réinitialiser</Button>
    </div>
    {params.teamId ? <Link to={publicNavigation.team(params.teamId)}>Voir l’équipe sélectionnée</Link> : null}
    {!parsed.success ? <Alert>Les filtres sont invalides. Réinitialisez les critères.</Alert> : <PublicResourceState query={query} label="Joueuses" />}
    {parsed.success && query.data ? <><p role="status">{query.data.pagination.total} joueuse{query.data.pagination.total > 1 ? "s" : ""}</p>
      {query.data.data.length ? <ul className="public-person-list" aria-label="Joueuses disponibles">
        {query.data.data.map((player) => <li key={player.id}><Link to={publicNavigation.player(player.id)}><PublicLeagueLogo name={`${player.firstName} ${player.lastName}`} logoUrl={player.pictureUrl} /><span>{player.firstName} {player.lastName}<small className="public-secondary-line">{player.team.name} · {player.position ?? "Poste non renseigné"}</small></span></Link></li>)}
      </ul> : <EmptyState>Aucune joueuse ne correspond à vos critères.</EmptyState>}
      {query.data.pagination.totalPages > 0 ? <Pagination label="Pagination des joueuses" page={params.page} totalPages={query.data.pagination.totalPages} onPageChange={(page) => change("page", String(page))} /> : null}
    </> : null}
  </section>;
}
