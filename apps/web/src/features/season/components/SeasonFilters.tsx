import type { ListSeasonsParams } from "@lucarne/shared";
import { Button, FormField, Input, Select } from "../../../ui";

interface SeasonFiltersProps {
  onChange: (changes: Partial<ListSeasonsParams>) => void;
  onReset: () => void;
  params: ListSeasonsParams;
}

function SeasonFilters({ onChange, onReset, params }: SeasonFiltersProps) {
  return (
    <div className="dashboard-list__filters" role="search">
      <FormField htmlFor="season-search" label="Rechercher">
        <Input
          id="season-search"
          onChange={(event) => onChange({ search: event.target.value || undefined })}
          placeholder="Nom de la saison"
          value={params.search ?? ""}
        />
      </FormField>
      <FormField htmlFor="season-status" label="État">
        <Select
          id="season-status"
          onChange={(event) => onChange({ status: event.target.value as ListSeasonsParams["status"] })}
          value={params.status ?? "ALL"}
        >
          <option value="ALL">Toutes</option>
          <option value="CURRENT">Courantes</option>
          <option value="INACTIVE">Inactives</option>
        </Select>
      </FormField>
      <Button onClick={onReset} variant="outline">Réinitialiser</Button>
    </div>
  );
}

export default SeasonFilters;
