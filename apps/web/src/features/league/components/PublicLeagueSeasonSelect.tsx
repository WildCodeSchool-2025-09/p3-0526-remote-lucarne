import type { PublicLeagueSeason } from "@lucarne/shared";
import { useId } from "react";
import { Select } from "../../../ui";

function PublicLeagueSeasonSelect({ seasons, seasonId, onChange }: {
  seasons: PublicLeagueSeason[];
  seasonId: string;
  onChange: (seasonId: string) => void;
}) {
  const id = useId();
  return <div className="public-league-season">
    <label className="lucarne-form-field__label" htmlFor={id}>Saison</label>
    <Select disabled={seasons.length === 0} id={id} onChange={(event) => onChange(event.target.value)} value={seasonId}>
      <option disabled value="">{seasons.length === 0 ? "Aucune saison disponible" : "Choisir une saison"}</option>
      {seasons.map((season) => <option key={season.id} value={season.id}>
        {season.name}{season.isCurrent ? " — Saison courante" : ""}
      </option>)}
    </Select>
  </div>;
}

export default PublicLeagueSeasonSelect;
