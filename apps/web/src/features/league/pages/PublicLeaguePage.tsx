import { usePublicLeagueContext } from "../hooks/usePublicLeagueContext";
import LeagueMatchesCard from "../components/LeagueMatchesCard";
import PublicLeagueStandingsPanel from "../../ranking/PublicLeagueStandingsPanel";
import PublicLeagueStatisticsPanel from "../../ranking/PublicLeagueStatisticsPanel";

function PublicLeaguePage() {
  const { league, seasonId } = usePublicLeagueContext();
  return <>
    <LeagueMatchesCard hasSeasons={league.seasons.length > 0} leagueId={league.id} leagueSlug={league.slug} seasonId={seasonId} />
    <LeagueMatchesCard hasSeasons={league.seasons.length > 0} leagueId={league.id} leagueSlug={league.slug} results seasonId={seasonId} />
    <PublicLeagueStandingsPanel slug={league.slug} seasonId={seasonId} preview />
    <PublicLeagueStatisticsPanel slug={league.slug} seasonId={seasonId} preview />
  </>;
}

export default PublicLeaguePage;
