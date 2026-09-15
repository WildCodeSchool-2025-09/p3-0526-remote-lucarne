import type { ListPlayersParams, PlayerStatusFilter } from "@lucarne/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import DashboardListFilters from "../../../components/dashboard/DashboardListFilters";
import { Button, Input, Select, temporaryIcons } from "../../../ui";

type SuggestionField = "player" | "team" | "position";
type PlayerSortField = "lastName" | "createdAt";

interface PlayerFiltersProps {
  canCreate?: boolean;
  onChange: (changes: Partial<ListPlayersParams>) => void;
  onReset: () => void;
  params: ListPlayersParams;
  playerNames: string[];
  positions: string[];
  teamNames: string[];
}

function PlayerAutocomplete({ ariaLabel, field, options, value, onChange, placeholder }: { ariaLabel: string; field: SuggestionField; options: string[]; value: string; onChange: (value: string) => void; placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = `player-${field}-filter`;
  const suggestionsId = `player-${field}-suggestions`;
  const SearchIcon = temporaryIcons.search;
  const suggestions = useMemo(() => {
    const search = value.trim().toLocaleLowerCase("fr");
    return [...new Set(options)].filter((option) => option.toLocaleLowerCase("fr").includes(search)).sort((left, right) => left.localeCompare(right, "fr"));
  }, [options, value]);

  return (
    <div className="dashboard-list__field dashboard-list__autocomplete dashboard-list__field--name">
      <label htmlFor={inputId}>{ariaLabel}</label>
      <div className="dashboard-list__autocomplete-control">
        <SearchIcon aria-hidden="true" className="dashboard-list__filter-icon" size={18} />
        <Input aria-autocomplete="list" aria-controls={isOpen ? suggestionsId : undefined} aria-expanded={isOpen} aria-label={ariaLabel} id={inputId} onBlur={() => window.setTimeout(() => setIsOpen(false), 0)} onChange={(event) => { setIsOpen(true); onChange(event.target.value); }} onFocus={() => setIsOpen(true)} onKeyDown={(event) => { if (event.key === "Enter" && suggestions[0] != null) { event.preventDefault(); onChange(suggestions[0]); setIsOpen(false); } }} placeholder={placeholder} type="search" value={value} />
      </div>
      {isOpen ? <div aria-label={`Suggestions de ${ariaLabel.toLocaleLowerCase("fr")}`} className="dashboard-list__suggestions" id={suggestionsId} role="listbox">{suggestions.length === 0 ? <span className="dashboard-list__suggestions-empty" role="status">Non disponible</span> : suggestions.map((option) => <button aria-selected={value === option} className="dashboard-list__suggestion" key={option} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option); setIsOpen(false); }} role="option" type="button">{option}</button>)}</div> : null}
    </div>
  );
}

function PlayerFilters({ canCreate = false, onChange, onReset, params, playerNames, positions, teamNames }: PlayerFiltersProps) {
  const FilterIcon = temporaryIcons.filter;
  const activeCount = Number(Boolean(params.search)) + Number(Boolean(params.teamName)) + Number(Boolean(params.position)) + Number(params.status !== "ALL");

  return <DashboardListFilters activeCount={activeCount} label="Filtres des joueuses" mobileAction={canCreate ? <Link className="lucarne-button lucarne-button--primary lucarne-button--xl dashboard-list__mobile-create" to="/dashboard/players/new">Ajouter une joueuse</Link> : undefined}>
    <PlayerAutocomplete ariaLabel="Rechercher une joueuse par nom" field="player" onChange={(value) => onChange({ search: value })} options={playerNames} placeholder="Saisir un nom" value={params.search ?? ""} />
    <PlayerAutocomplete ariaLabel="Équipe" field="team" onChange={(value) => onChange({ teamName: value })} options={teamNames} placeholder="Saisir une équipe" value={params.teamName ?? ""} />
    <PlayerAutocomplete ariaLabel="Poste" field="position" onChange={(value) => onChange({ position: value })} options={positions} placeholder="Saisir un poste" value={params.position ?? ""} />
    <label className="dashboard-list__field dashboard-list__field--status"><span><FilterIcon aria-hidden="true" size={16} />Statut</span><Select aria-label="Filtrer par statut" onChange={(event) => onChange({ status: event.target.value as PlayerStatusFilter })} value={params.status}><option value="ALL">Toutes</option><option value="ACTIVE">Actives</option><option value="INACTIVE">Inactives</option></Select></label>
    <label className="dashboard-list__field dashboard-list__field--sort"><span>Tri</span><Select aria-label="Trier les joueuses" onChange={(event) => { const [sortBy, sortOrder] = event.target.value.split(":"); onChange({ sortBy: sortBy as PlayerSortField, sortOrder: sortOrder as "asc" | "desc" }); }} value={`${params.sortBy}:${params.sortOrder}`}><option value="lastName:asc">Nom : A à Z</option><option value="lastName:desc">Nom : Z à A</option><option value="createdAt:asc">Date de création : croissante</option><option value="createdAt:desc">Date de création : décroissante</option></Select></label>
    <Button className="dashboard-list__reset" onClick={onReset} variant="outline">Réinitialiser</Button>
  </DashboardListFilters>;
}

export default PlayerFilters;
