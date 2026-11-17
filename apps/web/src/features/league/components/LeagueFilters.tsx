import { leagueStyles } from "../leagueStyles";
import type {
  LeagueSortField,
  LeagueStatusFilter,
  ListLeaguesParams,
} from "@lucarne/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import DashboardListFilters from "../../../components/dashboard/DashboardListFilters";
import { Button, Input, Select, temporaryIcons } from "../../../ui";

interface LeagueFiltersProps {
  canCreate: boolean;
  countries: string[];
  params: ListLeaguesParams;
  onChange: (changes: Partial<ListLeaguesParams> & { countries?: string[] }) => void;
  onReset: () => void;
  leagueNames: string[];
}

function LeagueFilters({
  canCreate,
  countries,
  params,
  onChange,
  onReset,
  leagueNames,
}: LeagueFiltersProps) {
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
    <DashboardListFilters
      activeCount={
        Number(Boolean(params.search)) +
        Number((params.countries?.length ?? 0) > 0) +
        Number(params.status !== "ALL")
      }
      label="Filtres des ligues"
      mobileAction={
        canCreate ? (
          <Link
            className={`
              lucarne-button lucarne-button--primary lucarne-button--xl hidden!
              league-mobile:inline-flex! league-mobile:w-full league-mobile:self-stretch!
              league-mobile:justify-center league-mobile:order-6
            `}
            to="/dashboard/leagues/new"
          >
            Ajouter une ligue
          </Link>
        ) : undefined
      }
    >
      <div className={`${leagueStyles.autocomplete} league-mobile:order-2`}>
        <label htmlFor="league-name-filter">Nom de la ligue</label>
        <div className={leagueStyles.autocompleteControl}>
          <SearchIcon
            aria-hidden="true"
            className="shrink-0 text-[var(--color-text-muted)]"
            size={18}
          />
          <Input
            className="min-h-[34px]! min-w-[120px]! w-auto! flex-1 border-0! bg-transparent! px-1!"
            aria-autocomplete="list"
            aria-controls={
              isLeagueSuggestionsOpen ? "league-name-suggestions" : undefined
            }
            aria-expanded={isLeagueSuggestionsOpen}
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
          <div
            aria-label="Suggestions de ligues"
            className={leagueStyles.suggestions}
            id="league-name-suggestions"
            role="listbox"
          >
            {leagueSuggestions.length === 0 ? (
              <span
                className="px-3 py-2.5 text-[13px] text-[var(--color-text-muted)]"
                role="status"
              >
                Non disponible
              </span>
            ) : (
              leagueSuggestions.map((name) => (
                <button
                  aria-selected={params.search === name}
                  className={leagueStyles.suggestion}
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
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className={`${leagueStyles.autocomplete} league-mobile:order-3`}>
        <label htmlFor="league-country-filter">Pays</label>
        <div className={leagueStyles.autocompleteControl}>
          {(params.countries ?? []).map((country) => (
            <button
              aria-label={`Retirer ${country}`}
              className={`
                cursor-pointer rounded-full border border-[var(--color-border-default)]
                bg-[var(--color-bg-subtle)] px-2 py-1 text-[13px]
                text-[var(--color-text-primary)] focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-[var(--color-action-primary)]
              `}
              key={country}
              onClick={() =>
                onChange({
                  countries: params.countries?.filter((item) => item !== country),
                })
              }
              type="button"
            >
              {country} ×
            </button>
          ))}
          <Input
            className="min-h-[34px]! min-w-[120px]! w-auto! flex-1 border-0! bg-transparent! px-1!"
            aria-autocomplete="list"
            aria-controls={
              isCountrySuggestionsOpen ? "league-country-suggestions" : undefined
            }
            aria-expanded={isCountrySuggestionsOpen}
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
          <div
            aria-label="Suggestions de pays"
            className={leagueStyles.suggestions}
            id="league-country-suggestions"
            role="listbox"
          >
            {countrySuggestions.length === 0 ? (
              <span
                className="px-3 py-2.5 text-[13px] text-[var(--color-text-muted)]"
                role="status"
              >
                Non disponible
              </span>
            ) : (
              countrySuggestions.map((country) => (
                <button
                  aria-selected={params.countries?.includes(country) ?? false}
                  className={leagueStyles.suggestion}
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
              ))
            )}
          </div>
        ) : null}
      </div>

      <label className={`${leagueStyles.filterField} league-mobile:order-1`}>
        <span>
          <FilterIcon aria-hidden="true" size={16} />
          Statut
        </span>
        <Select
          className="min-w-0 px-[10px]!"
          aria-label="Filtrer par statut"
          onChange={(event) =>
            onChange({ status: event.target.value as LeagueStatusFilter })
          }
          value={params.status}
        >
          <option value="ALL">Tous</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </label>

      <label className={`${leagueStyles.filterField} league-mobile:order-4`}>
        <span>Tri</span>
        <Select
          className="min-w-0 px-[10px]!"
          aria-label="Trier les ligues"
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(":");

            onChange({
              sortBy: sortBy as LeagueSortField,
              sortOrder: sortOrder as "asc" | "desc",
            });
          }}
          value={`${params.sortBy}:${params.sortOrder}`}
        >
          <option value="name:asc">Nom : A à Z</option>
          <option value="name:desc">Nom : Z à A</option>
          <option value="createdAt:asc">Date de création : croissante</option>
          <option value="createdAt:desc">Date de création : décroissante</option>
        </Select>
      </label>
      <Button
        className={`
          min-w-[120px] flex-none self-end! whitespace-nowrap league-mobile:order-5
          league-mobile:w-full
        `}
        onClick={onReset}
        variant="outline"
      >
        Réinitialiser
      </Button>
    </DashboardListFilters>
  );
}

export default LeagueFilters;
