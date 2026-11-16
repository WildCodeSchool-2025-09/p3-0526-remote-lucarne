import { Link, useParams } from "react-router";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import PublicResourceState from "../../../components/public/PublicResourceState";
import PublicShareButton from "../../../components/public/PublicShareButton";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { formatDate } from "../../../lib/dateFormat";
import PublicMatchListPage from "../../match/pages/PublicMatchListPage";
import { usePublicMatchday } from "../hooks/usePublicSeasons";

export default function PublicMatchdayPage() {
  const { matchdayId = "" } = useParams();
  const query = usePublicMatchday(matchdayId);
  const day = query.data;
  const calendar = day ? `${publicNavigation.leagueCalendar(day.league.slug)}?${new URLSearchParams({ seasonId: day.season.id })}` : publicNavigation.calendar;
  return <section className="public-resource-page public-page-stack">
    <PublicBreadcrumb items={[{ label: "Ligues", to: publicNavigation.leagues }, ...(day ? [{ label: day.league.name, to: `${publicNavigation.league(day.league.slug)}?${new URLSearchParams({ seasonId: day.season.id })}` }] : []), { label: "Calendrier", to: calendar }, { label: day ? `Journée ${day.number}` : "Journée" }]} />
    <Link to={calendar}>← Retour au calendrier des matchs</Link>
    <PublicResourceState query={query} label="Journée" />
    {day ? <><h1>Journée {day.number}{day.name ? ` · ${day.name}` : ""}</h1><PublicShareButton />
      <p><Link to={publicNavigation.season(day.season.id)}>Saison {day.season.name}</Link>{day.startDate ? ` · À partir du ${formatDate(day.startDate)}` : ""}{day.endDate ? ` · Jusqu’au ${formatDate(day.endDate)}` : ""}</p>
      <PublicMatchListPage scope={{ matchdayId: day.id, leagueId: day.league.id, seasonId: day.season.id }} />
    </> : null}
  </section>;
}
