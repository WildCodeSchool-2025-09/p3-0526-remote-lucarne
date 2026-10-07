import { dashboardStyles } from "./dashboardStyles";
import logoFull from "../../../docs/images/logo-blanc-sans-fond.png";
import logoMark from "../../../docs/images/logo-sans-texte-blanc.png";
import { Link } from "react-router";
import DashboardNavigation, {
  type DashboardNavigationItemKey,
} from "./DashboardNavigation";

interface DashboardSidebarProps {
  activeItem?: DashboardNavigationItemKey;
  onNavigate?: () => void;
}

function DashboardSidebar({ activeItem, onNavigate }: DashboardSidebarProps) {
  return (
    <aside aria-label="Dashboard" className={dashboardStyles.sidebar}>
      <div className={dashboardStyles.brand}>
        <Link
          onClick={onNavigate}
          to={"/dashboard/"}>
          <img alt="Lucarne" className={dashboardStyles.sidebarLogo} src={logoFull} />
        </Link>
        <img
          alt=""
          aria-hidden="true"
          className={dashboardStyles.sidebarMark}
          src={logoMark}
        />
      </div>
      <DashboardNavigation activeItem={activeItem} />
    </aside>
  );
}

export default DashboardSidebar;
