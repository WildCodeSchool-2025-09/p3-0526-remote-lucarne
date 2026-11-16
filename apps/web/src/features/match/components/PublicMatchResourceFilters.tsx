import type { MatchListQuery } from "@lucarne/shared";
import { Alert, Button, Select } from "../../../ui";
import { usePublicLeagueNavigation } from "../../league/hooks/usePublicLeagueNavigation";
import { usePublicLeague } from "../../league/hooks/usePublicLeague";
import { usePublicMatchdays } from "../../season/hooks/usePublicSeasons";
import PublicTeamFilter from "../../team/components/PublicTeamFilter";

export type PublicMatchScope = { leagueId?: string; seasonId?: string; teamId?: string; matchdayId?: string };

export default function PublicMatchResourceFilters({ params, scope, onChange }: { params: MatchListQuery; scope?: PublicMatchScope; onChange: (field: string, value: string) => void }) {
  const leagues = usePublicLeagueNavigation();
  const selectedLeague = leagues.data?.find((league) => league.id === params.leagueId);
  const league = usePublicLeague(!scope?.seasonId ? selectedLeague?.slug ?? "" : "");
  const days = usePublicMatchdays(!scope?.matchdayId ? selectedLeague?.slug ?? "" : "", params.seasonId ?? "");
  return <>
    {!scope?.leagueId ? <label className="public-search-field"><span>Ligue</span><Select value={params.leagueId ?? ""} onChange={(event) => onChange("leagueId", event.target.value)} disabled={leagues.isPending}>
      <option value="">Toutes les ligues</option>{leagues.data?.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.country}</option>)}
    </Select></label> : null}
    {!scope?.seasonId && params.leagueId ? <label className="public-search-field"><span>Saison du calendrier</span><Select value={params.seasonId ?? ""} onChange={(event) => onChange("seasonId", event.target.value)} disabled={!league.data}>
      <option value="">Toutes les saisons</option>{league.data?.seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </Select></label> : null}
    {!scope?.matchdayId && params.leagueId && params.seasonId ? <label className="public-search-field"><span>Journée</span><Select value={params.matchdayId ?? ""} onChange={(event) => onChange("matchdayId", event.target.value)} disabled={!days.data}>
      <option value="">Toutes les journées</option>{days.data?.map((day) => <option key={day.id} value={day.id}>Journée {day.number}{day.name ? ` · ${day.name}` : ""}</option>)}
    </Select></label> : null}
    {leagues.isError ? <Alert>Les ligues sont indisponibles. <Button variant="outline" onClick={() => void leagues.refetch()}>Réessayer les ligues</Button></Alert> : null}
    {league.isError ? <Alert>Les saisons sont indisponibles. <Button variant="outline" onClick={() => void league.refetch()}>Réessayer les saisons</Button></Alert> : null}
    {days.isError ? <Alert>Les journées sont indisponibles. <Button variant="outline" onClick={() => void days.refetch()}>Réessayer les journées</Button></Alert> : null}
    {!scope?.teamId ? <PublicTeamFilter key={`${params.leagueId ?? ""}/${params.seasonId ?? ""}`} teamId={params.teamId} leagueId={params.leagueId} seasonId={params.seasonId} onChange={(value) => onChange("teamId", value)} /> : null}
  </>;
}
