import { dashboardStyles } from "./dashboardStyles";
import type { ReactNode } from "react";
import { useLocation } from "react-router";
import DashboardMobileHeader from "./DashboardMobileHeader";
import DashboardSidebar from "./DashboardSidebar";
import type { DashboardNavigationItemKey } from "./DashboardNavigation";

interface DashboardLayoutProps {
  activeItem?: DashboardNavigationItemKey;
  children: ReactNode;
}

function DashboardLayout({ activeItem, children }: DashboardLayoutProps) {
  const location = useLocation();

  return (
    <div className={dashboardStyles.layout}>
      <DashboardSidebar activeItem={activeItem} />
      <div className="min-w-0 flex-auto">
        <DashboardMobileHeader activeItem={activeItem} key={location.key} />
        <div className={dashboardStyles.main}>{children}</div>
      </div>
    </div>
  );
}

export default DashboardLayout;
