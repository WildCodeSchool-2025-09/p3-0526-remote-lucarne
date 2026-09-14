import { Link } from "react-router";
import { temporaryIcons } from "../../../ui";

interface LeaguePageHeaderProps {
  canCreate: boolean;
  leagueCount: number;
}

function LeaguePageHeader({ canCreate, leagueCount }: LeaguePageHeaderProps) {
  const LeagueIcon = temporaryIcons.leagues;

  return (
    <header className="league-list-page__header">
      <div>
        <p className="league-list-page__breadcrumb"><span>Administration</span> / <strong>Ligues</strong></p>
        <p className="league-list-page__eyebrow">Ligues</p>
        <h1 aria-label="Ligues" id="league-list-title">
          <LeagueIcon aria-hidden="true" className="league-list-page__title-icon" size={28} />
          Ligues
          <span className="league-list-page__count">{leagueCount} ligues</span>
        </h1>
        <p>Consulter et gérer les ligues.</p>
      </div>
      {canCreate ? (
        <Link className="lucarne-button lucarne-button--primary lucarne-button--xl league-list__create" to="/dashboard/leagues/new">
          Ajouter une ligue
        </Link>
      ) : null}
    </header>
  );
}

export default LeaguePageHeader;
