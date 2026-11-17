import type { PublicLeagueTeam } from "@lucarne/shared";
import PublicLeagueLogo from "./PublicLeagueLogo";
import { Link } from "react-router";
import { publicNavigation } from "../../../components/public/publicRoutes";

function PublicLeagueTeamsList({ teams }: { teams: PublicLeagueTeam[] }) {
  return <ul aria-label="Équipes participantes" className="public-league-teams">
    {teams.map((team) => <li key={team.id}>
      <Link className="public-league-team" to={publicNavigation.team(team.id)}>
        <PublicLeagueLogo logoUrl={team.logoUrl} name={team.name} />
        <h3>{team.name}</h3>
      </Link>
    </li>)}
  </ul>;
}

export default PublicLeagueTeamsList;
