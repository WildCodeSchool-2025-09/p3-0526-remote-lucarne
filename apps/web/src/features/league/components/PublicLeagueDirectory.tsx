import type { PublicLeagueNavigationItem } from "@lucarne/shared";
import { Link } from "react-router";
import { publicNavigation } from "../../../components/public/publicRoutes";
import PublicLeagueLogo from "./PublicLeagueLogo";

function PublicLeagueDirectory({ leagues }: { leagues: PublicLeagueNavigationItem[] }) {
  return <ul className="public-league-directory">
    {leagues.map((league) => <li key={league.id}>
      <Link to={publicNavigation.league(league.slug)}>
        <PublicLeagueLogo logoUrl={league.logoUrl} name={league.name} />
        <span>{league.name}</span>
        <span aria-hidden="true">›</span>
      </Link>
    </li>)}
  </ul>;
}

export default PublicLeagueDirectory;
