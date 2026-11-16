import { Link } from "react-router";
import logoFull from "../../../docs/images/logo-blanc-sans-fond.png";
import logoMark from "../../../docs/images/logo-sans-texte-blanc.png";
import PublicAccountActions from "./PublicAccountActions";
import PublicNavigation from "./PublicNavigation";
import { publicNavigation } from "./publicRoutes";
import { publicStyles } from "./publicStyles";

interface PublicSidebarProps {
  compact?: boolean;
  onNavigate?: () => void;
}

function PublicSidebar({ compact = false, onNavigate }: PublicSidebarProps) {
  return (
    <aside aria-label="Lucarne" className={publicStyles.sidebar}>
      <Link aria-label="Lucarne — Accueil" className={publicStyles.brand} onClick={onNavigate} to={publicNavigation.home}>
        <img alt="" className={compact ? publicStyles.compactLogo : publicStyles.fullLogo} src={compact ? logoMark : logoFull} />
      </Link>
      <PublicNavigation compact={compact} onNavigate={onNavigate} />
      <div className="min-h-8 flex-auto" />
      <PublicAccountActions compact={compact} onNavigate={onNavigate} />
    </aside>
  );
}

export default PublicSidebar;
