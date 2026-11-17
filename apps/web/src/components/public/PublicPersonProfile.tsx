import { Link } from "react-router";
import type { PublicPlayerProfile, PublicStaffProfile } from "@lucarne/shared";
import PublicLeagueLogo from "../../features/league/components/PublicLeagueLogo";
import PublicBreadcrumb from "./PublicBreadcrumb";
import PublicShareButton from "./PublicShareButton";
import { publicNavigation } from "./publicRoutes";

export default function PublicPersonProfile({ person }: { person: PublicPlayerProfile | PublicStaffProfile }) {
  const name = `${person.firstName} ${person.lastName}`;
  const player = "position" in person;
  return <>
    <PublicBreadcrumb items={player ? [{ label: "Joueuses", to: publicNavigation.players }, { label: name }] : [
      { label: "Équipes", to: publicNavigation.teams }, { label: person.team.name, to: publicNavigation.team(person.team.id) }, { label: name },
    ]} />
    <Link to={player ? publicNavigation.players : publicNavigation.teamRoster(person.team.id)}>{player ? "← Retour aux joueuses" : "← Retour à l’effectif"}</Link>
    <header className="public-resource-header"><PublicLeagueLogo name={name} logoUrl={person.pictureUrl} /><div><h1>{name}</h1><p>{player ? person.position ?? "Poste non renseigné" : person.jobTitle}</p></div><PublicShareButton /></header>
    <section className="public-league-card"><h2>Informations {player ? "de la joueuse" : "du membre du staff"}</h2>
      <dl className="public-facts">
        <div><dt>Équipe actuelle</dt><dd><Link to={publicNavigation.team(person.team.id)}>{person.team.name}</Link></dd></div>
        <div><dt>Nationalité</dt><dd>{person.nationality ?? "Non renseignée"}</dd></div>
        <div><dt>{player ? "Poste" : "Fonction"}</dt><dd>{player ? person.position ?? "Non renseigné" : person.jobTitle}</dd></div>
        {player ? <div><dt>Numéro de maillot</dt><dd>{person.shirtNumber ?? "Non renseigné"}</dd></div> : null}
      </dl>
      <Link to={publicNavigation.teamRoster(person.team.id)}>Voir l’effectif de {person.team.name}</Link>
    </section>
  </>;
}
