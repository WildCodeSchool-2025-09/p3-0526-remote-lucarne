import { useEffect } from "react";
import { Outlet, useMatches, useNavigate } from "react-router";

interface AppRouteHandle {
  usesDashboardListLayout?: boolean;
}

function isAppRouteHandle(value: unknown): value is AppRouteHandle {
  return typeof value === "object" && value != null;
}

function App() {
  const navigate = useNavigate();
  const matches = useMatches();
  const usesDashboardListLayout = matches.some(
    (match) => isAppRouteHandle(match.handle) && match.handle.usesDashboardListLayout === true,
  );

  useEffect(() => {
    const onSessionExpired = () => void navigate(import.meta.env.DEV ? "/dev/login" : "/", { replace: true });
    window.addEventListener("lucarne:session-expired", onSessionExpired);
    return () => window.removeEventListener("lucarne:session-expired", onSessionExpired);
  }, [navigate]);

  return (
    <>
      {usesDashboardListLayout ? null : <header>Lucarnes</header>}
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
