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

function PlayerAutocomplete({
  ariaLabel,
  field,
  options,
  value,
  onChange,
  placeholder,
}: {
  ariaLabel: string;
  field: SuggestionField;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = `player-${field}-filter`;
  const suggestionsId = `player-${field}-suggestions`;
  const SearchIcon = temporaryIcons.search;
  const suggestions = useMemo(() => {
    const search = value.trim().toLocaleLowerCase("fr");

    return [...new Set(options)]
      .filter((option) => option.toLocaleLowerCase("fr").includes(search))
      .sort((left, right) => left.localeCompare(right, "fr"));
  }, [options, value]);

  return (
    <div
      className={`
      relative m-0 grid min-w-0 flex-[1.5_1_220px] gap-2 border-0 p-0 player-mobile:order-2
      player-mobile:w-full player-mobile:flex-none
    `}
    >
      <label
        className="text-[14px] font-semibold text-[var(--color-text-secondary)]"
        htmlFor={inputId}
      >
        {ariaLabel}
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
          aria-controls={isOpen ? suggestionsId : undefined}
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          id={inputId}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 0)}
          onChange={(event) => {
            setIsOpen(true);
            onChange(event.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && suggestions[0] != null) {
              event.preventDefault();
              onChange(suggestions[0]);
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </div>
      {isOpen ? (
        <div
          aria-label={`Suggestions de ${ariaLabel.toLocaleLowerCase("fr")}`}
          className={`
            absolute inset-x-0 top-[calc(100%+4px)] z-5 grid max-h-[220px] overflow-y-auto
            rounded-[var(--radius-md)] border border-[var(--color-border-default)]
            bg-[var(--color-bg-surface)] shadow-[var(--shadow-popover)]
          `}
          id={suggestionsId}
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
            suggestions.map((option) => (
              <button
                aria-selected={value === option}
                className={`
                  min-h-10 cursor-pointer border-0 bg-transparent px-3 py-2 text-left
                  hover:bg-[var(--color-bg-subtle)] focus-visible:bg-[var(--color-bg-subtle)]
                  focus-visible:outline-2 focus-visible:-outline-offset-2
                  focus-visible:outline-[var(--color-action-primary)]
                `}
                key={option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                {option}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlayerFilters({
  canCreate = false,
  onChange,
  onReset,
  params,
  playerNames,
  positions,
  teamNames,
}: PlayerFiltersProps) {
  const FilterIcon = temporaryIcons.filter;
  const activeCount =
    Number(Boolean(params.search)) +
    Number(Boolean(params.teamName)) +
    Number(Boolean(params.position)) +
    Number(params.status !== "ALL");

  return (
    <DashboardListFilters
      activeCount={activeCount}
      label="Filtres des joueuses"
      mobileAction={
        canCreate ? (
          <Link
            className={`
              lucarne-button lucarne-button--primary lucarne-button--xl hidden!
              player-mobile:inline-flex! player-mobile:w-full player-mobile:self-stretch!
              player-mobile:justify-center player-mobile:order-6
            `}
            to="/dashboard/players/new"
          >
            Ajouter une joueuse
          </Link>
        ) : undefined
      }
    >
      <PlayerAutocomplete
        ariaLabel="Rechercher une joueuse"
        field="player"
        onChange={(value) => onChange({ search: value })}
        options={playerNames}
        placeholder="Saisir un nom"
        value={params.search ?? ""}
      />
      <PlayerAutocomplete
        ariaLabel="Équipe"
        field="team"
        onChange={(value) => onChange({ teamName: value })}
        options={teamNames}
        placeholder="Saisir une équipe"
        value={params.teamName ?? ""}
      />
      <PlayerAutocomplete
        ariaLabel="Poste"
        field="position"
        onChange={(value) => onChange({ position: value })}
        options={positions}
        placeholder="Saisir un poste"
        value={params.position ?? ""}
      />
      <label
        className={`
        grid min-w-0 flex-[1_1_190px] gap-2 player-mobile:order-1 player-mobile:w-full
        player-mobile:flex-none
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
            onChange({ status: event.target.value as PlayerStatusFilter })
          }
          value={params.status}
        >
          <option value="ALL">Toutes</option>
          <option value="ACTIVE">Actives</option>
          <option value="INACTIVE">Inactives</option>
        </Select>
      </label>
      <label
        className={`
        grid min-w-0 flex-[1_1_190px] gap-2 player-mobile:order-4 player-mobile:w-full
        player-mobile:flex-none
      `}
      >
        <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-text-secondary)]">
          Tri
        </span>
        <Select
          className="min-w-0 px-[10px]!"
          aria-label="Trier les joueuses"
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(":");

            onChange({
              sortBy: sortBy as PlayerSortField,
              sortOrder: sortOrder as "asc" | "desc",
            });
          }}
          value={`${params.sortBy}:${params.sortOrder}`}
        >
          <option value="lastName:asc">Nom : A à Z</option>
          <option value="lastName:desc">Nom : Z à A</option>
          <option value="createdAt:asc">Date de création : croissante</option>
          <option value="createdAt:desc">Date de création : décroissante</option>
        </Select>
      </label>
      <Button
        className={`
        min-w-[120px] flex-none self-end! whitespace-nowrap player-mobile:order-5
        player-mobile:w-full
      `}
        onClick={onReset}
        variant="outline"
      >
        Réinitialiser
      </Button>
    </DashboardListFilters>
  );
}

export default PlayerFilters;
