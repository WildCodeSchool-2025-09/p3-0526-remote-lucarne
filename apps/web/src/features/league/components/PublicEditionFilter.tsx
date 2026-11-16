import { Alert, Button, Select } from "../../../ui";
import { usePublicLeagueNavigation } from "../hooks/usePublicLeagueNavigation";
import { usePublicLeague } from "../hooks/usePublicLeague";

export default function PublicEditionFilter({ leagueId, seasonId, onChange, label = "" }: { leagueId: string; seasonId: string; onChange: (field: string, value: string) => void; label?: string }) {
  const leagues = usePublicLeagueNavigation();
  const selected = leagues.data?.find((league) => league.id === leagueId);
  const league = usePublicLeague(selected?.slug ?? "");
  return <>
    <label className="public-search-field"><span>Ligue{label}</span><Select value={leagueId} onChange={(event) => onChange("leagueId", event.target.value)} disabled={leagues.isPending}><option value="">Choisir une ligue</option>{leagues.data?.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.country}</option>)}</Select></label>
    <label className="public-search-field"><span>Saison{label}</span><Select value={seasonId} onChange={(event) => onChange("seasonId", event.target.value)} disabled={!league.data}><option value="">Choisir une saison</option>{league.data?.seasons.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></label>
    {leagues.isError ? <Alert>Impossible de charger les ligues. <Button variant="outline" onClick={() => void leagues.refetch()}>Réessayer les ligues</Button></Alert> : null}
    {league.isError ? <Alert>Impossible de charger les saisons. <Button variant="outline" onClick={() => void league.refetch()}>Réessayer les saisons</Button></Alert> : null}
  </>;
}
