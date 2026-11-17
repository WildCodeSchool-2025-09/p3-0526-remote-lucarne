import type { PublicTeamDetail } from "@lucarne/shared";
import { useSearchParams } from "react-router";
import { EmptyState, Select } from "../../ui";
import PublicResourceState from "../../components/public/PublicResourceState";
import { usePublicTeamStatistics } from "./usePublicStatistics";

export default function PublicTeamStatisticsPanel({ team }: { team: PublicTeamDetail }) {
  const [search, setSearch] = useSearchParams();
  const requested = search.has("leagueId") || search.has("seasonId");
  const edition = requested ? team.editions.find((edition) => edition.league.id === search.get("leagueId") && edition.season.id === search.get("seasonId")) : team.editions.find((edition) => edition.isCurrent);
  const query = usePublicTeamStatistics(team.id, { leagueId: edition?.league.id ?? "", seasonId: edition?.season.id ?? "" });
  return <section className="public-league-card"><h2>Statistiques de l’équipe</h2>
    {team.editions.length ? <label className="public-search-field"><span>Édition des statistiques</span><Select value={edition ? `${edition.league.id}/${edition.season.id}` : ""} onChange={(event) => {
      const selected = team.editions.find((item) => `${item.league.id}/${item.season.id}` === event.target.value);
      if (selected) setSearch((current) => { const next = new URLSearchParams(current); next.set("leagueId", selected.league.id); next.set("seasonId", selected.season.id); return next; });
    }}><option value="" disabled>Choisir une compétition et une saison</option>{team.editions.map((item) => <option key={`${item.league.id}/${item.season.id}`} value={`${item.league.id}/${item.season.id}`}>{item.league.name} · {item.season.name}</option>)}</Select></label> : null}
    {!edition ? <EmptyState>Choisissez une édition disponible pour consulter les statistiques.</EmptyState> : <PublicResourceState query={query} label="Statistiques de l’équipe" />}
    {query.data ? <dl className="public-facts"><div><dt>Rang</dt><dd>{query.data.rank}</dd></div><div><dt>Points</dt><dd>{query.data.points}</dd></div><div><dt>Matchs joués</dt><dd>{query.data.played}</dd></div><div><dt>Victoires / Nuls / Défaites</dt><dd>{query.data.wins} / {query.data.draws} / {query.data.losses}</dd></div><div><dt>Buts marqués / encaissés</dt><dd>{query.data.goalsFor} / {query.data.goalsAgainst}</dd></div><div><dt>Différence de buts</dt><dd>{query.data.goalDifference}</dd></div></dl> : null}
  </section>;
}
