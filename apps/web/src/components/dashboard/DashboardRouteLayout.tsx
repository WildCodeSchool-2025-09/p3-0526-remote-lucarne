import { useSyncExternalStore } from "react";
import { Navigate, Outlet, useMatches } from "react-router";
import DashboardLayout from "./DashboardLayout";
import { dashboardResources, type DashboardResource } from "./dashboardResources";
import { DASHBOARD_ROLES, getCurrentAppRole, hasRole } from "../../auth/authRole";
import { getSessionRevision, subscribeSession } from "../../lib/authToken";
import { publicNavigation } from "../public/publicRoutes";

function DashboardRouteLayout() {
  useSyncExternalStore(subscribeSession, getSessionRevision, getSessionRevision);
  const matches = useMatches();
  // Guard the entire branch before mounting navigation or domain queries.
  if (!hasRole(getCurrentAppRole(), DASHBOARD_ROLES)) {
    return <Navigate to={publicNavigation.home} replace />;
  }
  const resource = matches
    .map((match) => {
      const handle: unknown = match.handle;

      if (
        typeof handle !== "object" ||
        handle === null ||
        !("dashboardResource" in handle)
      )
        return undefined;

      const key = handle.dashboardResource;

      return typeof key === "string" &&
        Object.prototype.hasOwnProperty.call(dashboardResources, key)
        ? (key as DashboardResource)
        : undefined;
    })
    .find((key) => key !== undefined);

  return (
    <DashboardLayout activeItem={resource}>
      <Outlet />
    </DashboardLayout>
  );
}

export default DashboardRouteLayout;
