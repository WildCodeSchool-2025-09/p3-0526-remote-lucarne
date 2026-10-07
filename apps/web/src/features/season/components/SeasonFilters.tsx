import type { ListSeasonsParams } from "@lucarne/shared";
import { Button, FormField, Input } from "../../../ui";

interface SeasonFiltersProps {
  onChange: (changes: Partial<ListSeasonsParams>) => void;
  onReset: () => void;
  params: ListSeasonsParams;
}

function SeasonFilters({ onChange, onReset, params }: SeasonFiltersProps) {
  return (
    <div
      className={`
        flex flex-wrap items-end gap-4 rounded-[var(--radius-surface)] border
        border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5
        season-mobile:flex-col season-mobile:items-stretch season-mobile:p-4
      `}
      role="search"
    >
      <FormField htmlFor="season-search" label="Rechercher">
        <Input
          id="season-search"
          onChange={(event) => onChange({ search: event.target.value || undefined })}
          placeholder="Nom de la saison"
          value={params.search ?? ""}
        />
      </FormField>
      <Button
        className="min-w-[120px] flex-none self-end! whitespace-nowrap season-mobile:order-5 season-mobile:w-full"
        onClick={onReset}
        variant="outline"
      >
        Réinitialiser
      </Button>
    </div>
  );
}

export default SeasonFilters;
