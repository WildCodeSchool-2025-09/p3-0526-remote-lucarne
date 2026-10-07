import { dashboardStyles } from "./dashboardStyles";
import type { ReactNode } from "react";
import type { LucideIcon } from "../../ui";
import DashboardBreadcrumb, {
  type DashboardBreadcrumbProps,
} from "./DashboardBreadcrumb";

interface DashboardPageHeaderProps extends DashboardBreadcrumbProps {
  title: string;
  headingId?: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

function DashboardPageHeader({
  title,
  headingId,
  description,
  icon: Icon,
  badge,
  actions,
  breadcrumb,
  ...navigation
}: DashboardPageHeaderProps) {
  return (
    <header className={dashboardStyles.pageHeader}>
      <div>
        {breadcrumb ?? <DashboardBreadcrumb {...navigation} />}
        <h1 className={dashboardStyles.title} aria-label={title} id={headingId}>
          {Icon ? (
            <Icon aria-hidden="true" className={dashboardStyles.titleIcon} size={28} />
          ) : null}
          {title}
          {badge}
        </h1>
        {description ? (
          <p className={dashboardStyles.description}>{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

export default DashboardPageHeader;
