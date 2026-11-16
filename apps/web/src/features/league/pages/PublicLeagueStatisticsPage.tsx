import PublicLeagueStatisticsPanel from "../../ranking/PublicLeagueStatisticsPanel";
import { usePublicLeagueContext } from "../hooks/usePublicLeagueContext";

export default function PublicLeagueStatisticsPage() {
  const { league, seasonId } = usePublicLeagueContext();
  return <PublicLeagueStatisticsPanel slug={league.slug} seasonId={seasonId} />;
}
