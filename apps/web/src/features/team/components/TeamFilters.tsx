import type { ListTeamsParams, TeamSortField, TeamStatusFilter } from "@lucarne/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import DashboardListFilters from "../../../components/dashboard/DashboardListFilters";
import { Button, Input, Select, temporaryIcons } from "../../../ui";

interface TeamFiltersProps {
  canCreate: boolean;
  onChange: (changes: Partial<ListTeamsParams>) => void;
  onReset: () => void;
  params: ListTeamsParams;
  teamNames: string[];
}

function TeamFilters({ canCreate, onChange, onReset, params, teamNames }: TeamFiltersProps) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const SearchIcon = temporaryIcons.search;
  const FilterIcon = temporaryIcons.filter;
  const suggestions = useMemo(() => {
    const search = (params.search ?? "").trim().toLocaleLowerCase("fr");

    return [...new Set(teamNames)]
      .filter((name) => name.toLocaleLowerCase("fr").includes(search))
      .sort((left, right) => left.localeCompare(right, "fr"));
  }, [params.search, teamNames]);

  return (
    <DashboardListFilters
      activeCount={Number(Boolean(params.search)) + Number(params.status !== "ALL")}
      label="Filtres des équipes"
      mobileAction={canCreate ? (
        <Link className="lucarne-button lucarne-button--primary lucarne-button--xl dashboard-list__mobile-create" to="/dashboard/teams/new">
          Ajouter une équipe
        </Link>
      ) : undefined}
    >
      <div className="dashboard-list__field dashboard-list__autocomplete dashboard-list__field--name">
        <label htmlFor="team-name-filter">Nom de l’équipe</label>
        <div className="dashboard-list__autocomplete-control">
          <SearchIcon aria-hidden="true" className="dashboard-list__filter-icon" size={18} />
          <Input
            aria-autocomplete="list"
            aria-controls={isSuggestionsOpen ? "team-name-suggestions" : undefined}
            aria-expanded={isSuggestionsOpen}
            aria-label="Rechercher une équipe par nom"
            id="team-name-filter"
            onBlur={() => window.setTimeout(() => setIsSuggestionsOpen(false), 0)}
            onChange={(event) => {
              setIsSuggestionsOpen(true);
              onChange({ search: event.target.value });
            }}
            onFocus={() => setIsSuggestionsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && suggestions[0] != null) {
                event.preventDefault();
                onChange({ search: suggestions[0] });
                setIsSuggestionsOpen(false);
              }
            }}
            placeholder="Saisir un nom"
            type="search"
            value={params.search ?? ""}
          />
        </div>
        {isSuggestionsOpen ? (
          <div aria-label="Suggestions d’équipes" className="dashboard-list__suggestions" id="team-name-suggestions" role="listbox">
            {suggestions.length === 0 ? (
              <span className="dashboard-list__suggestions-empty" role="status">Non disponible</span>
            ) : suggestions.map((name) => (
              <button
                aria-selected={params.search === name}
                className="dashboard-list__suggestion"
                key={name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ search: name });
                  setIsSuggestionsOpen(false);
                }}
                role="option"
                type="button"
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <label className="dashboard-list__field dashboard-list__field--status">
        <span><FilterIcon aria-hidden="true" size={16} />Statut</span>
        <Select
          aria-label="Filtrer par statut"
          onChange={(event) => onChange({ status: event.target.value as TeamStatusFilter })}
          value={params.status}
        >
          <option value="ALL">Tous</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </label>

      <label className="dashboard-list__field dashboard-list__field--sort">
        <span>Tri</span>
        <Select
          aria-label="Trier les équipes"
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(":");
            onChange({ sortBy: sortBy as TeamSortField, sortOrder: sortOrder as "asc" | "desc" });
          }}
          value={`${params.sortBy}:${params.sortOrder}`}
        >
          <option value="name:asc">Nom : A à Z</option>
          <option value="name:desc">Nom : Z à A</option>
          <option value="createdAt:asc">Date de création : croissante</option>
          <option value="createdAt:desc">Date de création : décroissante</option>
        </Select>
      </label>

      <Button className="dashboard-list__reset" onClick={onReset} variant="outline">Réinitialiser</Button>
    </DashboardListFilters>
  );
}

export default TeamFilters;
