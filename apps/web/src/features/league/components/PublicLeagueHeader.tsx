import type { PublicLeagueDetail } from "@lucarne/shared";
import PublicLeagueLogo from "./PublicLeagueLogo";

function PublicLeagueHeader({ league }: { league: PublicLeagueDetail }) {
  return <header className="public-league-header">
    <span className="public-league-header__logo">
      <PublicLeagueLogo logoUrl={league.logoUrl} name={league.name} />
    </span>
    <div><h1 id="public-league-title">{league.name}</h1>{league.country ? <p className="public-secondary-line">{league.country}</p> : null}</div>
  </header>;
}

export default PublicLeagueHeader;
