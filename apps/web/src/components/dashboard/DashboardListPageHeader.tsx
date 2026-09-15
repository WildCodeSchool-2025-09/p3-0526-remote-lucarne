import { Link } from "react-router";
import type { LucideIcon } from "../../ui";

interface DashboardListPageHeaderProps {
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
  return (
    <header className="dashboard-list-page__header">
      <div>
        <p className="dashboard-list-page__breadcrumb"><span>Administration</span> / <strong>{title}</strong></p>
        <h1 aria-label={title} id={headingId}>
          <Icon aria-hidden="true" className="dashboard-list-page__title-icon" size={28} />
          {title}
          <span className="dashboard-list-page__count">{count} {countLabel}</span>
        </h1>
        <p>{description}</p>
      </div>
      {canCreate ? (
        <Link className="lucarne-button lucarne-button--primary lucarne-button--xl dashboard-list__create" to={createHref}>
          {createLabel}
        </Link>
      ) : null}
    </header>
  );
}

export default DashboardListPageHeader;
export type { DashboardListPageHeaderProps };
