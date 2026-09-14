import { useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { getCurrentAppRole } from "./auth/authRole";

function App() {
  const navigate = useNavigate();
  const role = getCurrentAppRole();

  useEffect(() => {
    const onSessionExpired = () => void navigate(import.meta.env.DEV ? "/dev/login" : "/", { replace: true });
    window.addEventListener("lucarne:session-expired", onSessionExpired);
    return () => window.removeEventListener("lucarne:session-expired", onSessionExpired);
  }, [navigate]);

  return (
    <>
      <header>Lucarnes</header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
