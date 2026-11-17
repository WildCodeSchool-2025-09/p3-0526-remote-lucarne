import { NavLink } from "react-router";
import { publicNavigation } from "../../../components/public/publicRoutes";

function PublicLeagueTabs({ leagueSlug, seasonId }: { leagueSlug: string; seasonId: string }) {
  const search = seasonId ? `?${new URLSearchParams({ seasonId }).toString()}` : "";
  const className = ({ isActive }: { isActive: boolean }) => isActive ? "public-league-tabs__active" : undefined;
  return <nav aria-label="Rubriques de la ligue" className="public-league-tabs">
    <NavLink className={className} end to={{ pathname: publicNavigation.league(leagueSlug), search }}>Vue d’ensemble</NavLink>
    <NavLink className={className} to={{ pathname: publicNavigation.leagueCalendar(leagueSlug), search }}>Calendrier</NavLink>
    <NavLink className={className} to={{ pathname: publicNavigation.leagueStandings(leagueSlug), search }}>Classement</NavLink>
    <NavLink className={className} to={{ pathname: publicNavigation.leagueStatistics(leagueSlug), search }}>Statistiques</NavLink>
    <NavLink className={className} to={{ pathname: publicNavigation.leagueTeams(leagueSlug), search }}>Équipes</NavLink>
  </nav>;
}

export default PublicLeagueTabs;
