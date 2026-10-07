import { dashboardStyles } from "./dashboardStyles";
import { Link } from "react-router";
import { dashboardResources, type DashboardResource } from "./dashboardResources";

export interface DashboardBreadcrumbProps {
  resource?: DashboardResource;
  mode?: "list" | "detail" | "create" | "edit";
  resourceId?: string;
  resourceName?: string;
}

function DashboardBreadcrumb({
  resource,
  mode = "list",
  resourceId,
  resourceName,
}: DashboardBreadcrumbProps) {
  const item = resource ? dashboardResources[resource] : undefined;
  const name = resourceName ?? item?.singular;

  return (
    <nav aria-label="Fil d’Ariane">
      <ol className={dashboardStyles.breadcrumb}>
        <li>
          {item ? (
            <Link to="/dashboard">Administration</Link>
          ) : (
            <strong aria-current="page">Administration</strong>
          )}
        </li>
        {item ? (
          <li>
            {mode === "list" ? (
              <strong aria-current="page">{item.label}</strong>
            ) : (
              <Link to={item.path}>{item.label}</Link>
            )}
          </li>
        ) : null}
        {item && (mode === "detail" || mode === "edit") ? (
          <li>
            {mode === "edit" && resourceId ? (
              <Link to={`${item.path}/${resourceId}`}>{name}</Link>
            ) : (
              <strong aria-current={mode === "detail" ? "page" : undefined}>
                {name}
              </strong>
            )}
          </li>
        ) : null}
        {mode === "create" || mode === "edit" ? (
          <li>
            <strong aria-current="page">
              {mode === "create" ? "Créer" : "Modifier"}
            </strong>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

export default DashboardBreadcrumb;
