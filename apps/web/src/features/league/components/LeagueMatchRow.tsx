import type { PublicMatch } from "@lucarne/shared";
import { Link } from "react-router";
import { matchSchedule, matchScore, matchStatusLabels } from "../../match/matchPresentation";
import { formatDate } from "../../../lib/dateFormat";
import PublicLeagueLogo from "./PublicLeagueLogo";
import { publicMatchLink } from "../../match/publicMatchNavigation";

function LeagueMatchRow({ match, results, returnTo, showStatus = false }: { match: PublicMatch; results: boolean; returnTo?: string; showStatus?: boolean }) {
  return <li>
    <Link aria-label={`${match.homeTeam.name} contre ${match.awayTeam.name}, ${results ? `${matchScore(match)}, ` : ""}${matchSchedule(match)}, ${matchStatusLabels[match.status]}`}
      className={`public-league-match${results ? " public-league-match--result" : ""}`} to={publicMatchLink(match.matchPublicId, returnTo)}>
      <span className="public-league-match__team public-league-match__team--home">
        <PublicLeagueLogo logoUrl={match.homeTeam.logoUrl} name={match.homeTeam.name} />
        <span>{match.homeTeam.name}</span>
      </span>
      {results ? <span className="public-league-match__score">{matchScore(match)}</span> : null}
      <span className="public-league-match__schedule">
        <time dateTime={match.matchDate}>{formatDate(match.matchDate)}</time>
        {!results ? <span className="public-league-match__time"> à {match.startTime} (Paris)</span> : null}
      </span>
      <span className="public-league-match__team public-league-match__team--away">
        <span>{match.awayTeam.name}</span>
        <PublicLeagueLogo logoUrl={match.awayTeam.logoUrl} name={match.awayTeam.name} />
      </span>
      {showStatus ? <span className="public-league-match__status">{matchStatusLabels[match.status]}</span> : null}
    </Link>
  </li>;
}

export default LeagueMatchRow;
