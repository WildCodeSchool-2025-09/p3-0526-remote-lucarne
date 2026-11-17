import PublicLeagueStandingsPanel from "../../ranking/PublicLeagueStandingsPanel";
import PublicLeagueStatisticsPanel from "../../ranking/PublicLeagueStatisticsPanel";
import { usePublicLeagueContext } from "../hooks/usePublicLeagueContext";

export default function PublicLeagueStandingsPage() {
  const { league, seasonId } = usePublicLeagueContext();
  return <><PublicLeagueStandingsPanel slug={league.slug} seasonId={seasonId} /><PublicLeagueStatisticsPanel slug={league.slug} seasonId={seasonId} /></>;
}
