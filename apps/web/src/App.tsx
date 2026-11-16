import { Outlet, useMatches } from "react-router";
import { BugReportWidget } from "./features/bug-report/components/BugReportWidget";
import { AuthProvider } from "./features/auth/AuthProvider";

interface AppRouteHandle {
  usesDashboardLayout?: boolean;
  usesPublicLayout?: boolean;
}

function isAppRouteHandle(value: unknown): value is AppRouteHandle {
  return typeof value === "object" && value != null;
}

function AppContent() {
  const matches = useMatches();
  const usesDashboardLayout = matches.some(
    (match) => isAppRouteHandle(match.handle) && match.handle.usesDashboardLayout === true,
  );
  const usesPublicLayout = matches.some(
    (match) => isAppRouteHandle(match.handle) && match.handle.usesPublicLayout === true,
  );

  return <>
    {usesDashboardLayout || usesPublicLayout ? null : <header>Lucarnes</header>}
    {usesPublicLayout ? <Outlet /> : <main><Outlet /></main>}
    {import.meta.env.DEV ? <BugReportWidget /> : null}
  </>;
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
