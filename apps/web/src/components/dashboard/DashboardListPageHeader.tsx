import { dashboardStyles } from "./dashboardStyles";
import type { ReactNode } from "react";
import { Link } from "react-router";
import DashboardPageHeader from "./DashboardPageHeader";
import { dashboardResources } from "./dashboardResources";
import type { LucideIcon } from "../../ui";

interface DashboardListPageHeaderProps {
  breadcrumb?: ReactNode;
  canCreate: boolean;
  count: number;
  countLabel: string;
  createHref: string;
  createLabel: string;
  description: string;
  headingId: string;
  icon: LucideIcon;
  title: string;
}

function DashboardListPageHeader({
  breadcrumb,
  canCreate,
  count,
  countLabel,
  createHref,
  createLabel,
  description,
  headingId,
  icon: Icon,
  title,
}: DashboardListPageHeaderProps) {
  const resource = Object.entries(dashboardResources).find(
    ([, item]) => `${item.path}/new` === createHref,
  )?.[0] as keyof typeof dashboardResources | undefined;

  return (
    <DashboardPageHeader
      resource={resource}
      breadcrumb={breadcrumb}
      title={title}
      headingId={headingId}
      icon={Icon}
      description={description}
      badge={
        <span className={dashboardStyles.count}>
          {count} {countLabel}
        </span>
      }
      actions={
        canCreate ? (
          <Link className={dashboardStyles.createLink} to={createHref}>
            {createLabel}
          </Link>
        ) : null
      }
    />
  );
}

export default DashboardListPageHeader;

export type { DashboardListPageHeaderProps };
