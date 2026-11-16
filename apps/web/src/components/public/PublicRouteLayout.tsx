import { Outlet } from "react-router";
import PublicLayout from "./PublicLayout";

function PublicRouteLayout() {
  return <PublicLayout><Outlet /></PublicLayout>;
}

export default PublicRouteLayout;
