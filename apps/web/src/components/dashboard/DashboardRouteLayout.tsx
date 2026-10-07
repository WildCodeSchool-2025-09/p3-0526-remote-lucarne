import { Outlet, useMatches } from "react-router";
import DashboardLayout from "./DashboardLayout";
import { dashboardResources, type DashboardResource } from "./dashboardResources";

function DashboardRouteLayout() {
  const matches = useMatches();
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
