import PublicMatchListPage from "../../match/pages/PublicMatchListPage";
import { usePublicLeagueContext } from "../hooks/usePublicLeagueContext";

function PublicLeagueCalendarPage() {
  const { league, seasonId } = usePublicLeagueContext();
  return <PublicMatchListPage scope={{ leagueId: league.id, seasonId }} />;
}

export default PublicLeagueCalendarPage;
