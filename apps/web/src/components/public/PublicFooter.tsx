import { Link } from "react-router";
import { publicNavigation } from "./publicRoutes";

function PublicFooter() {
  return <footer className="public-footer">
    <Link to={publicNavigation.home}>Lucarne</Link>
    <nav aria-label="Liens du pied de page">
      <Link to={publicNavigation.leagues}>Toutes les ligues</Link>
      <Link to={publicNavigation.teams}>Annuaire des équipes</Link>
      <Link to={publicNavigation.players}>Annuaire des joueuses</Link>
      <Link to={publicNavigation.calendar}>Calendrier des matchs</Link>
    </nav>
  </footer>;
}

export default PublicFooter;
