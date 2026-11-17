import { useRef, useState } from "react";
import { Alert, Button, EmptyState, Input, LoadingState, Pagination } from "../../../ui";
import { usePublicTeam, usePublicTeams } from "../hooks/usePublicTeams";

export default function PublicTeamFilter({ teamId, leagueId, seasonId, onChange }: { teamId?: string; leagueId?: string; seasonId?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const current = usePublicTeam(teamId ?? "", Boolean(teamId));
  const teams = usePublicTeams({ page, limit: 20, ...(search ? { search } : {}), ...(leagueId ? { leagueId } : {}), ...(seasonId ? { seasonId } : {}) }, open);
  const close = () => { if (details.current) details.current.open = false; trigger.current?.focus(); };
  const select = (id: string) => { onChange(id); close(); };
  return <div className="public-team-filter">
    {teamId ? <p>Équipe : {current.data?.name ?? "équipe sélectionnée"} <Button variant="ghost" onClick={() => select("")}>Toutes les équipes</Button></p> : null}
    <details ref={details} onToggle={(event) => setOpen(event.currentTarget.open)} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); close(); } }}>
      <summary ref={trigger}>{teamId ? "Changer d’équipe" : "Choisir une équipe"}</summary>
      {open ? <div className="public-page-stack public-team-filter__panel">
        <label className="public-search-field"><span>Rechercher une équipe dans le filtre</span><Input type="search" maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        {teams.isPending ? <LoadingState>Chargement des équipes…</LoadingState> : null}
        {teams.isError ? <Alert>Impossible de charger les équipes. <Button variant="outline" onClick={() => void teams.refetch()}>Réessayer les équipes</Button></Alert> : null}
        {teams.data ? <>
          {teams.data.data.length ? <ul className="public-team-filter__results" aria-label="Équipes du filtre">{teams.data.data.map((team) => <li key={team.id}><Button variant="ghost" onClick={() => select(team.id)}>{team.name}</Button></li>)}</ul> : <EmptyState>Aucune équipe disponible.</EmptyState>}
          {teams.data.pagination.totalPages > 1 ? <Pagination label="Pagination du filtre des équipes" page={page} totalPages={teams.data.pagination.totalPages} onPageChange={setPage} /> : null}
        </> : null}
      </div> : null}
    </details>
  </div>;
}
