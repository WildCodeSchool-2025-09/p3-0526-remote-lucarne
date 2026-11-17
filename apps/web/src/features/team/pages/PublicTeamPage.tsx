import { Link } from "react-router";
import PublicEditions from "../../../components/public/PublicEditions";
import { publicNavigation } from "../../../components/public/publicRoutes";
import PublicMatchPreview from "../../match/components/PublicMatchPreview";
import { usePublicTeamContext } from "../hooks/usePublicTeamContext";
import PublicTeamStatisticsPanel from "../../ranking/PublicTeamStatisticsPanel";

export default function PublicTeamPage() {
  const team = usePublicTeamContext();
  return <div className="public-home-grid">
    <div className="public-page-stack">
      <PublicMatchPreview title="Prochains matchs" status="SCHEDULED" teamId={team.id} />
      <PublicMatchPreview title="Derniers résultats" status="COMPLETED" teamId={team.id} />
      <PublicTeamStatisticsPanel team={team} />
    </div>
    <div className="public-page-stack">
      <section className="public-league-card"><h2>Informations de l’équipe</h2><dl className="public-facts"><div><dt>Stade</dt><dd>{team.stadium ?? "Non renseigné"}</dd></div></dl>
        <Link to={publicNavigation.teamRoster(team.id)}>Consulter l’effectif</Link>
      </section>
      <section className="public-league-card"><h2>Compétitions</h2><PublicEditions editions={team.editions} /></section>
    </div>
  </div>;
}
