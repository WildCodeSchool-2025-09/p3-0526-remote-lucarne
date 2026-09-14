import type { ReactNode } from "react";
import DashboardMobileHeader from "./DashboardMobileHeader";
import DashboardSidebar from "./DashboardSidebar";
import type { DashboardNavigationItemKey } from "./DashboardNavigation";

interface DashboardLayoutProps {
  activeItem: DashboardNavigationItemKey;
  children: ReactNode;
}

function DashboardLayout({ activeItem, children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <DashboardSidebar activeItem={activeItem} />
      <div className="dashboard-layout__content">
        <DashboardMobileHeader activeItem={activeItem} />
        <div className="dashboard-layout__main">{children}</div>
      </div>
    </div>
  );
}

export default DashboardLayout;
