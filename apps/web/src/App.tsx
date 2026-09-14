import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLeagueDashboard = location.pathname === "/dashboard/league";

  useEffect(() => {
    const onSessionExpired = () => void navigate(import.meta.env.DEV ? "/dev/login" : "/", { replace: true });
    window.addEventListener("lucarne:session-expired", onSessionExpired);
    return () => window.removeEventListener("lucarne:session-expired", onSessionExpired);
  }, [navigate]);

  return (
    <>
      {isLeagueDashboard ? null : <header>Lucarnes</header>}
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
