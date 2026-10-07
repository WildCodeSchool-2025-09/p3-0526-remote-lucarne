import { useEffect } from "react";
import { Outlet, useMatches, useNavigate } from "react-router";
import { BugReportWidget } from "./features/bug-report/components/BugReportWidget";

interface AppRouteHandle {
  usesDashboardLayout?: boolean;
}

function isAppRouteHandle(value: unknown): value is AppRouteHandle {
  return typeof value === "object" && value != null;
}

function App() {
  const navigate = useNavigate();
  const matches = useMatches();
  const usesDashboardLayout = matches.some(
    (match) => isAppRouteHandle(match.handle) && match.handle.usesDashboardLayout === true,
  );
  useEffect(() => {
    const onSessionExpired = () => void navigate(import.meta.env.DEV ? "/dev/login" : "/", {
      replace: true,
      state: { sessionExpired: true },
    });
    window.addEventListener("lucarne:session-expired", onSessionExpired);
    return () => window.removeEventListener("lucarne:session-expired", onSessionExpired);
  }, [navigate]);

  return <>
    {usesDashboardLayout ? null : <header>Lucarnes</header>}
    <main>
      <Outlet />
    </main>
    {import.meta.env.DEV ? <BugReportWidget /> : null}
  </>;
}

export default App;
