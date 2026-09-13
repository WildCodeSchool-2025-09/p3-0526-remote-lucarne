import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const onSessionExpired = () => void navigate(import.meta.env.DEV ? "/dev/login" : "/", { replace: true });
    window.addEventListener("lucarne:session-expired", onSessionExpired);
    return () => window.removeEventListener("lucarne:session-expired", onSessionExpired);
  }, [navigate]);

  return (
    <>
      <header>Lucarne</header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
