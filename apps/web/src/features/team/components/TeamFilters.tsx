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

function TeamFilters({
  canCreate,
  onChange,
  onReset,
  params,
  teamNames,
}: TeamFiltersProps) {
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
      mobileAction={
        canCreate ? (
          <Link
            className={`
          lucarne-button lucarne-button--primary lucarne-button--xl hidden!
          team-mobile:inline-flex! team-mobile:w-full team-mobile:self-stretch!
          team-mobile:justify-center team-mobile:order-6
        `}
            to="/dashboard/teams/new"
          >
            Ajouter une équipe
          </Link>
        ) : undefined
      }
    >
      <div
        className={`
        relative m-0 grid min-w-0 flex-[1.5_1_220px] gap-2 border-0 p-0 team-mobile:order-2
        team-mobile:w-full team-mobile:flex-none
      `}
      >
        <label
          className="text-[14px] font-semibold text-[var(--color-text-secondary)]"
          htmlFor="team-name-filter"
        >
          Nom de l’équipe
        </label>
        <div
          className={`
          flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border
          border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1
          focus-within:border-[var(--color-action-primary)]
          focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)]
        `}
        >
          <SearchIcon
            aria-hidden="true"
            className="shrink-0 text-[var(--color-text-muted)]"
            size={18}
          />
          <Input
            className="min-h-[34px]! min-w-[120px]! w-auto! flex-1 border-0! bg-transparent! px-1!"
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
          <div
            aria-label="Suggestions d’équipes"
            className={`
            absolute inset-x-0 top-[calc(100%+4px)] z-5 grid max-h-[220px] overflow-y-auto
            rounded-[var(--radius-md)] border border-[var(--color-border-default)]
            bg-[var(--color-bg-surface)] shadow-[var(--shadow-popover)]
          `}
            id="team-name-suggestions"
            role="listbox"
          >
            {suggestions.length === 0 ? (
              <span
                className="px-3 py-2.5 text-[13px] text-[var(--color-text-muted)]"
                role="status"
              >
                Non disponible
              </span>
            ) : (
              suggestions.map((name) => (
                <button
                  aria-selected={params.search === name}
                  className={`
                  min-h-10 cursor-pointer border-0 bg-transparent px-3 py-2 text-left
                  hover:bg-[var(--color-bg-subtle)] focus-visible:bg-[var(--color-bg-subtle)]
                  focus-visible:outline-2 focus-visible:-outline-offset-2
                  focus-visible:outline-[var(--color-action-primary)]
                `}
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
              ))
            )}
          </div>
        ) : null}
      </div>

      <label
        className={`
        grid min-w-0 flex-[1_1_190px] gap-2 team-mobile:order-1 team-mobile:w-full
        team-mobile:flex-none
      `}
      >
        <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-text-secondary)]">
          <FilterIcon aria-hidden="true" size={16} />
          Statut
        </span>
        <Select
          className="min-w-0 px-[10px]!"
          aria-label="Filtrer par statut"
          onChange={(event) =>
            onChange({ status: event.target.value as TeamStatusFilter })
          }
          value={params.status}
        >
          <option value="ALL">Tous</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </label>

      <label
        className={`
        grid min-w-0 flex-[1_1_190px] gap-2 team-mobile:order-4 team-mobile:w-full
        team-mobile:flex-none
      `}
      >
        <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-text-secondary)]">
          Tri
        </span>
        <Select
          className="min-w-0 px-[10px]!"
          aria-label="Trier les équipes"
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(":");
            onChange({
              sortBy: sortBy as TeamSortField,
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
        className="min-w-[120px] flex-none self-end! whitespace-nowrap team-mobile:order-5 team-mobile:w-full"
        onClick={onReset}
        variant="outline"
      >
        Réinitialiser
      </Button>
    </DashboardListFilters>
  );
}

export default TeamFilters;
