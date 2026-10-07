import { matchStyles } from "../matchStyles";
import type { PublicMatch } from "@lucarne/shared";
import { Link } from "react-router";
import { matchSchedule, matchScore, matchStatusLabels } from "../matchPresentation";

function PublicMatchCard({ match }: { match: PublicMatch }) {
  return (
    <article
      className={`
        ${matchStyles.detailCard} min-w-0 [&_h2]:text-[1.25rem]
        [&_h2]:[overflow-wrap:anywhere] [&_p]:mx-0 [&_p]:my-3
        [&_p]:[overflow-wrap:anywhere]
      `}
      role="listitem"
    >
      <p>
        {match.league.name} · {match.season.name} · Journée {match.matchday.number}
      </p>
      <h2>
        <Link to={`/matches/${match.matchPublicId}`}>
          {match.homeTeam.name} – {match.awayTeam.name}
        </Link>
      </h2>
      <p>{matchSchedule(match)}</p>
      <p>{matchStatusLabels[match.status]}</p>
      <p className="font-semibold">{matchScore(match)}</p>
      <p>{match.stadium ?? "Lieu non renseigné"}</p>
    </article>
  );
}

export default PublicMatchCard;
