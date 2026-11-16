import PublicMatchListPage from "../../match/pages/PublicMatchListPage";
import { usePublicTeamContext } from "../hooks/usePublicTeamContext";

export default function PublicTeamCalendarPage() {
  const team = usePublicTeamContext();
  return <PublicMatchListPage scope={{ teamId: team.id }} />;
}
