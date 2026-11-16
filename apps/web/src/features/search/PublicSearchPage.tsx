import { publicSearchQuerySchema, publicSearchTypeSchema } from "@lucarne/shared";
import type { PublicSearchType } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { Alert, Button, EmptyState, Input, Pagination, Select } from "../../ui";
import PublicBreadcrumb from "../../components/public/PublicBreadcrumb";
import PublicResourceState from "../../components/public/PublicResourceState";
import { usePublicPageBounds } from "../../components/public/usePublicPageBounds";
import PublicEditionFilter from "../league/components/PublicEditionFilter";
import PublicLeagueLogo from "../league/components/PublicLeagueLogo";
import PublicTeamFilter from "../team/components/PublicTeamFilter";
import { matchStatusLabels } from "../match/matchPresentation";
import { formatDate } from "../../lib/dateFormat";
import { usePublicSearch } from "./usePublicSearch";
import { publicSearchPosition, publicSearchResultPath, rememberPublicSearchPosition } from "./publicSearchNavigation";

const labels: Record<PublicSearchType, string> = { LEAGUE: "Ligues", TEAM: "Équipes", PLAYER: "Joueuses", SEASON: "Saisons", GAME_MATCH: "Matchs" };
export default function PublicSearchPage() {
  const location = useLocation();
  const [search, setSearch] = useSearchParams();
  const urlQuery = search.get("q") ?? "";
  const [draftState, setDraftState] = useState({ source: urlQuery, value: urlQuery });
  if (draftState.source !== urlQuery) setDraftState({ source: urlQuery, value: urlQuery });
  const draft = draftState.source === urlQuery ? draftState.value : urlQuery;
  const parsed = publicSearchQuerySchema.safeParse(Object.fromEntries(search));
  const params = parsed.success ? parsed.data : publicSearchQuerySchema.parse({});
  const query = usePublicSearch(params, parsed.success);
  usePublicPageBounds(params.page, query.data?.pagination.totalPages, setSearch);
  const returnPath = `${location.pathname}${location.search}`;
  useEffect(() => {
    const position = publicSearchPosition(returnPath);
    if (!query.isSuccess || position === undefined) return;
    const timer = window.setTimeout(() => window.scrollTo(0, position), 0);
    return () => window.clearTimeout(timer);
  }, [returnPath, query.isSuccess]);
  const change = (field: string, value: string) => setSearch((current) => {
    const next = new URLSearchParams(current); next.delete("page");
    if (field === "leagueId") { next.delete("seasonId"); next.delete("teamId"); }
    if (field === "seasonId") next.delete("teamId");
    if (value) next.set(field, value); else next.delete(field);
    return next;
  });
  return <section className="public-resource-page public-page-stack">
    <PublicBreadcrumb items={[{ label: "Recherche" }]} /><header className="public-page-heading"><h1>Recherche</h1><p>Recherchez une ligue, une équipe, une joueuse, une saison ou un match.</p></header>
    <form className="public-search-form" role="search" aria-label="Recherche globale" onSubmit={(event) => {
      event.preventDefault();
      if (parsed.success && params.q.length >= 2 && params.page === 1 && draft.trim().replace(/\s+/g, " ") === params.q) void query.refetch();
      change("q", draft);
    }}>
      <label className="public-search-field"><span>Votre recherche</span><Input type="search" maxLength={100} value={draft} onChange={(event) => setDraftState({ source: urlQuery, value: event.target.value })} aria-describedby="public-search-hint" hasError={!parsed.success} /></label>
      <Button type="submit">Rechercher</Button><p id="public-search-hint" className="public-secondary-line">Au moins deux caractères. La recherche ignore la casse et les accents.</p>
    </form>
    <details className="public-search-filters"><summary>Filtres de recherche</summary><div className="public-directory-filters">
      <PublicEditionFilter leagueId={params.leagueId ?? ""} seasonId={params.seasonId ?? ""} onChange={change} />
      <PublicTeamFilter key={`${params.leagueId ?? ""}/${params.seasonId ?? ""}`} teamId={params.teamId} leagueId={params.leagueId} seasonId={params.seasonId} onChange={(value) => change("teamId", value)} />
      <label className="public-search-field"><span>État du match</span><Select value={params.status ?? ""} onChange={(event) => change("status", event.target.value)}><option value="">Tous les états</option>{Object.entries(matchStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
      {[{ key: "dateFrom", label: "Matchs à partir du" }, { key: "dateTo", label: "Matchs jusqu’au" }].map(({ key, label }) => <label key={key} className="public-search-field"><span>{label}</span><Input type="date" value={search.get(key) ?? ""} onChange={(event) => change(key, event.target.value)} /></label>)}
      <Button variant="outline" onClick={() => setSearch(params.q ? { q: params.q } : {})}>Réinitialiser les filtres</Button>
    </div><p className="public-secondary-line">Les filtres de période et d’état limitent la recherche aux matchs.</p></details>
    {!parsed.success ? <Alert>Les critères sont invalides. Saisissez au moins deux caractères et vérifiez les filtres. <Button variant="outline" onClick={() => setSearch({})}>Effacer la recherche</Button></Alert> : !params.q ? <EmptyState>Saisissez votre recherche pour commencer.</EmptyState> : <>
      <PublicResourceState query={query} label="Recherche" />
      <nav aria-label="Catégories des résultats" className="public-league-tabs">
        <button type="button" aria-current={params.type === "ALL" ? "page" : undefined} onClick={() => change("type", "")}>Tout{query.data ? ` (${Object.values(query.data.counts).reduce((sum, count) => sum + count, 0)})` : ""}</button>
        {publicSearchTypeSchema.options.map((type) => <button type="button" key={type} aria-current={params.type === type ? "page" : undefined} onClick={() => change("type", type)}>{labels[type]}{query.data ? ` (${query.data.counts[type]})` : ""}</button>)}
      </nav>
      {query.data ? <><p role="status">{query.data.pagination.total} résultat{query.data.pagination.total > 1 ? "s" : ""} pour « {params.q} » · Tri par pertinence</p>
        {!query.data.data.length ? <EmptyState>Aucun résultat ne correspond à votre recherche.</EmptyState> : publicSearchTypeSchema.options.map((type) => {
          const rows = query.data.data.filter((row) => row.type === type);
          return rows.length ? <section key={type} className="public-league-card"><h2>{labels[type]}</h2><ul className="public-person-list" aria-label={`Résultats — ${labels[type]}`}>
            {rows.map((row) => <li key={row.id}><Link to={`${publicSearchResultPath(row)}?${new URLSearchParams({ searchReturnTo: returnPath })}`} onClick={() => rememberPublicSearchPosition(returnPath)}>
              <PublicLeagueLogo name={row.label} logoUrl={row.pictureUrl} /><span>{row.label}{row.description ? <small className="public-secondary-line">{row.description}</small> : null}{row.type === "GAME_MATCH" ? <small className="public-secondary-line">{formatDate(row.matchDate)} · {row.startTime} (Paris) · {matchStatusLabels[row.status]}</small> : null}</span><span aria-hidden="true">→</span>
            </Link></li>)}
          </ul></section> : null;
        })}
        {query.data.pagination.totalPages > 1 ? <Pagination label="Pagination de recherche" page={params.page} totalPages={query.data.pagination.totalPages} onPageChange={(page) => change("page", String(page))} /> : null}
      </> : null}
    </>}
  </section>;
}
