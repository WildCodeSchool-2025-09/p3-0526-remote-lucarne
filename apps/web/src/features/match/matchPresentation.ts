import type { AdminMatch, MatchStatus, PublicMatch } from "@lucarne/shared";
import { formatDate } from "../../lib/dateFormat";

const matchStatusLabels: Record<MatchStatus, string> = {
  SCHEDULED: "À venir",
  IN_PROGRESS: "En cours",
  COMPLETED: "Fini",
};
const matchSchedule = (
  match: Pick<AdminMatch | PublicMatch, "matchDate" | "startTime">,
) =>
  match.matchDate && match.startTime
    ? `${formatDate(match.matchDate)} à ${match.startTime} (Paris)`
    : "À programmer";
const matchScore = (match: Pick<AdminMatch | PublicMatch, "result">) =>
  match.result.homeScore === null || match.result.awayScore === null
    ? "Résultat non renseigné"
    : `${match.result.homeScore} – ${match.result.awayScore}`;

export { matchSchedule, matchScore, matchStatusLabels };
