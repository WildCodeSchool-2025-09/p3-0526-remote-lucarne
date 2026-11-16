import { Link } from "react-router";
import PublicResourceState from "../../../components/public/PublicResourceState";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { EmptyState } from "../../../ui";
import { formatDate } from "../../../lib/dateFormat";
import PublicLeagueLogo from "../../league/components/PublicLeagueLogo";
import { usePublicTeamRoster } from "../hooks/usePublicTeams";
import { usePublicTeamContext } from "../hooks/usePublicTeamContext";

export default function PublicTeamRosterPage() {
  const team = usePublicTeamContext();
  const query = usePublicTeamRoster(team.id);
  const roster = query.data;
  return <section className="public-page-stack"><h2>Effectif</h2>
    <PublicResourceState query={query} label="Effectif" />
    {roster ? <><p>Effectif au {formatDate(roster.date)}.</p><div className="public-home-grid">
      <section className="public-league-card"><h3>Joueuses</h3>
        {roster.players.length ? <ul className="public-person-list" aria-label="Joueuses de l’équipe">
          {roster.players.map((player) => <li key={player.id}><Link to={publicNavigation.player(player.id)}>
            <PublicLeagueLogo name={`${player.firstName} ${player.lastName}`} logoUrl={player.pictureUrl} />
            <span>{player.firstName} {player.lastName}<small className="public-secondary-line">{player.position ?? "Poste non renseigné"}</small></span>
            <span aria-label="Numéro de maillot">{player.shirtNumber !== null ? `N° ${player.shirtNumber}` : "—"}</span>
          </Link></li>)}
        </ul> : <EmptyState>Aucune joueuse dans l’effectif actuel.</EmptyState>}
      </section>
      <section className="public-league-card"><h3>Staff</h3>
        {roster.staffMembers.length ? <ul className="public-person-list" aria-label="Staff de l’équipe">
          {roster.staffMembers.map((member) => <li key={member.id}><Link to={publicNavigation.staff(member.id)}>
            <PublicLeagueLogo name={`${member.firstName} ${member.lastName}`} logoUrl={member.pictureUrl} />
            <span>{member.firstName} {member.lastName}<small className="public-secondary-line">{member.jobTitle}</small></span>
          </Link></li>)}
        </ul> : <EmptyState>Aucun membre du staff dans l’effectif actuel.</EmptyState>}
      </section>
    </div></> : null}
  </section>;
}
