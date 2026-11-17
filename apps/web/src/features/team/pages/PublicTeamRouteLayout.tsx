import { Link, NavLink, Outlet, useLocation, useParams } from "react-router";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import PublicResourceState from "../../../components/public/PublicResourceState";
import PublicShareButton from "../../../components/public/PublicShareButton";
import { publicNavigation } from "../../../components/public/publicRoutes";
import PublicLeagueLogo from "../../league/components/PublicLeagueLogo";
import { usePublicTeam } from "../hooks/usePublicTeams";

export default function PublicTeamRouteLayout() {
  const { teamId = "" } = useParams();
  const location = useLocation();
  const query = usePublicTeam(teamId);
  const team = query.data;
  const child = location.pathname.endsWith("/roster") ? "Effectif" : location.pathname.endsWith("/matches") ? "Calendrier" : undefined;
  return <section className="public-resource-page public-page-stack">
    <PublicBreadcrumb items={[{ label: "Équipes", to: publicNavigation.teams }, { label: team?.name ?? "Équipe", ...(child ? { to: publicNavigation.team(teamId) } : {}) }, ...(child ? [{ label: child }] : [])]} />
    <Link to={publicNavigation.teams}>← Retour aux équipes</Link>
    <PublicResourceState query={query} label="Équipe" />
    {team ? <>
      <header className="public-resource-header"><PublicLeagueLogo name={team.name} logoUrl={team.logoUrl} /><h1>{team.name}</h1><PublicShareButton /></header>
      <nav aria-label="Rubriques de l’équipe" className="public-league-tabs">
        <NavLink end to={publicNavigation.team(team.id)}>Vue d’ensemble</NavLink>
        <NavLink to={publicNavigation.teamRoster(team.id)}>Effectif</NavLink>
        <NavLink to={publicNavigation.teamCalendar(team.id)}>Calendrier</NavLink>
      </nav>
      <Outlet context={team} />
    </> : null}
  </section>;
}
