import type { LeagueSortField, LeagueStatusFilter, ListLeaguesParams } from "@lucarne/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Input, Select, temporaryIcons } from "../../../ui";

interface LeagueFiltersProps {
  countries: string[];
  params: ListLeaguesParams;
  onChange: (changes: Partial<ListLeaguesParams> & { countries?: string[] }) => void;
  onReset: () => void;
  leagueNames: string[];
}

function LeagueFilters({ countries, params, onChange, onReset, leagueNames }: LeagueFiltersProps) {
  const [countryInput, setCountryInput] = useState("");
  const [isLeagueSuggestionsOpen, setIsLeagueSuggestionsOpen] = useState(false);
  const [isCountrySuggestionsOpen, setIsCountrySuggestionsOpen] = useState(false);
  const SearchIcon = temporaryIcons.search;
  const FilterIcon = temporaryIcons.filter;

  const countrySuggestions = countries.filter((country) =>
    country.toLocaleLowerCase("fr").includes(countryInput.trim().toLocaleLowerCase("fr")),
  );
  const leagueSuggestions = useMemo(() => {
    const search = (params.search ?? "").trim().toLocaleLowerCase("fr");

    return [...new Set(leagueNames)]
      .filter((name) => name.toLocaleLowerCase("fr").includes(search))
      .sort((left, right) => left.localeCompare(right, "fr"));
  }, [leagueNames, params.search]);

  const addCountry = (value: string) => {
    const country = value.trim();

    if (!country || params.countries?.includes(country)) {
      setCountryInput("");
      return;
    }

    onChange({ countries: [...(params.countries ?? []), country] });
    setCountryInput("");
  };

  return (
    <div aria-label="Filtres des ligues" className="league-list__filters">
      <Link className="lucarne-button lucarne-button--primary lucarne-button--xl league-list__mobile-create" to="/dashboard/leagues/new">
        Ajouter une ligue
      </Link>
      <div className="league-list__field league-list__countries league-list__name-filter">
        <label htmlFor="league-name-filter">Nom de la ligue</label>
        <div className="league-list__country-control">
          <SearchIcon aria-hidden="true" className="league-list__filter-icon" size={18} />
          <Input
            aria-label="Rechercher une ligue par nom"
            id="league-name-filter"
            onBlur={() => window.setTimeout(() => setIsLeagueSuggestionsOpen(false), 0)}
            onChange={(event) => {
              setIsLeagueSuggestionsOpen(true);
              onChange({ search: event.target.value });
            }}
            onFocus={() => setIsLeagueSuggestionsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && leagueSuggestions[0] != null) {
                event.preventDefault();
                onChange({ search: leagueSuggestions[0] });
                setIsLeagueSuggestionsOpen(false);
              }
            }}
            placeholder="Saisir un nom"
            type="search"
            value={params.search ?? ""}
          />
        </div>
        {isLeagueSuggestionsOpen ? (
          <div aria-label="Suggestions de ligues" className="league-list__country-suggestions" role="listbox">
            {leagueSuggestions.length === 0 ? (
              <span className="league-list__country-empty" role="status">Non disponible</span>
            ) : leagueSuggestions.map((name) => (
              <button
                aria-selected={params.search === name}
                className="league-list__country-suggestion"
                key={name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ search: name });
                  setIsLeagueSuggestionsOpen(false);
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

      <div className="league-list__field league-list__countries league-list__country-filter">
        <label htmlFor="league-country-filter">Pays</label>
        <div className="league-list__country-control">
          {(params.countries ?? []).map((country) => (
            <button
              aria-label={`Retirer ${country}`}
              className="league-list__country-tag"
              key={country}
              onClick={() => onChange({ countries: params.countries?.filter((item) => item !== country) })}
              type="button"
            >
              {country} ×
            </button>
          ))}
          <Input
            aria-label="Ajouter un pays"
            id="league-country-filter"
            onBlur={() => window.setTimeout(() => setIsCountrySuggestionsOpen(false), 0)}
            onChange={(event) => {
              setCountryInput(event.target.value);
              setIsCountrySuggestionsOpen(true);
            }}
            onFocus={() => setIsCountrySuggestionsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCountry(countryInput);
                setIsCountrySuggestionsOpen(false);
              }
            }}
            placeholder={params.countries?.length ? "Ajouter un pays" : "Saisir un pays"}
            type="search"
            value={countryInput}
          />
        </div>
        {isCountrySuggestionsOpen ? (
          <div aria-label="Suggestions de pays" className="league-list__country-suggestions" role="listbox">
            {countrySuggestions.length === 0 ? (
              <span className="league-list__country-empty" role="status">Non disponible</span>
            ) : countrySuggestions.map((country) => (
              <button
                aria-selected={params.countries?.includes(country) ?? false}
                className="league-list__country-suggestion"
                key={country}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  addCountry(country);
                  setIsCountrySuggestionsOpen(false);
                }}
                role="option"
                type="button"
              >
                {country}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <label className="league-list__field">
        <span><FilterIcon aria-hidden="true" size={16} />Statut</span>
        <Select
          aria-label="Filtrer par statut"
          onChange={(event) => onChange({ status: event.target.value as LeagueStatusFilter })}
          value={params.status}
        >
          <option value="ALL">Tous</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </label>

      <label className="league-list__field">
        <span>Tri</span>
        <Select
          aria-label="Trier les ligues"
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(":");
            onChange({ sortBy: sortBy as LeagueSortField, sortOrder: sortOrder as "asc" | "desc" });
          }}
          value={`${params.sortBy}:${params.sortOrder}`}
        >
          <option value="name:asc">Nom : A à Z</option>
          <option value="name:desc">Nom : Z à A</option>
          <option value="createdAt:asc">Date de création : croissante</option>
          <option value="createdAt:desc">Date de création : décroissante</option>
        </Select>
      </label>
      <Button className="league-list__reset" onClick={onReset} variant="outline">Réinitialiser</Button>
    </div>
  );
}

export default LeagueFilters;
