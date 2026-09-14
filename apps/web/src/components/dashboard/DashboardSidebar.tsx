import logoFull from "../../../docs/images/logo-blanc-sans-fond.png";
import logoMark from "../../../docs/images/logo-sans-texte-blanc.png";
import DashboardNavigation, { type DashboardNavigationItemKey } from "./DashboardNavigation";

interface DashboardSidebarProps {
  activeItem: DashboardNavigationItemKey;
}

function DashboardSidebar({ activeItem }: DashboardSidebarProps) {
  return (
    <aside aria-label="Dashboard" className="dashboard-sidebar">
      <div className="dashboard-sidebar__brand">
        <img alt="Lucarne" className="dashboard-sidebar__logo" src={logoFull} />
        <img alt="" aria-hidden="true" className="dashboard-sidebar__logo-mark" src={logoMark} />
      </div>
      <DashboardNavigation activeItem={activeItem} />
    </aside>
  );
}

export default DashboardSidebar;
