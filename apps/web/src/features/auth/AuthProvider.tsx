import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { clearAccessToken, getAccessToken, getSessionRevision, subscribeSession } from "../../lib/authToken";
import { getCurrentAppRole } from "../../auth/authRole";
import { getSessionUser } from "../../services/auth.service";
import AuthModal from "./components/AuthModal";
import { AuthContext } from "./AuthContext";
import type { AuthMode } from "./AuthContext";

function getExpiration(token: string): number | null {
  try {
    const segment = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!segment) return null;
    const payload: unknown = JSON.parse(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, "=")));
    return typeof payload === "object" && payload !== null && "exp" in payload && typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const revision = useSyncExternalStore(subscribeSession, getSessionRevision, getSessionRevision);
  const token = getAccessToken();
  const location = useLocation();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ mode: AuthMode; message?: string; returnFocus?: HTMLElement | null } | null>(null);
  const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const validToken = token !== null && getCurrentAppRole() !== null;
  const session = useQuery({
    queryKey: ["auth", "me", revision], queryFn: getSessionUser,
    enabled: validToken && !isDashboard && location.pathname !== "/dev/login", retry: false,
  });
  const openAuth = useCallback((mode: AuthMode, returnFocus?: HTMLElement | null) => {
    setModal({ mode, returnFocus: returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null) });
  }, []);
  const closeAuth = useCallback(() => setModal(null), []);

  useEffect(() => {
    const expired = () => {
      if (isDashboard) void navigate("/", { replace: true });
      setModal((current) => ({ mode: "login", message: "Votre session a expiré. Reconnectez-vous pour continuer.", returnFocus: current?.returnFocus }));
    };
    window.addEventListener("lucarne:session-expired", expired);
    return () => window.removeEventListener("lucarne:session-expired", expired);
  }, [isDashboard, navigate]);

  useEffect(() => {
    if (!token) return undefined;
    const expire = () => {
      if (getAccessToken() !== token) return;
      clearAccessToken();
      window.dispatchEvent(new Event("lucarne:session-expired"));
    };
    if (!validToken) { expire(); return undefined; }
    const expiration = getExpiration(token);
    if (expiration === null) return undefined;
    const timer = window.setTimeout(expire, Math.max(0, expiration - Date.now()));
    return () => window.clearTimeout(timer);
  }, [token, validToken]);

  const logout = () => {
    clearAccessToken(); setModal(null);
    if (isDashboard) void navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ role: validToken ? session.data?.role ?? null : null, authenticated: validToken, checking: validToken && session.isPending, sessionError: validToken && session.isError, retrySession: () => { void session.refetch(); }, openAuth, logout }}>
      <div aria-hidden={modal ? true : undefined} inert={modal !== null}>{children}</div>
      {modal ? <AuthModal key={modal.mode} mode={modal.mode} message={modal.message} onClose={closeAuth} onSwitch={(mode) => setModal((current) => ({ ...current, mode, message: undefined }))} returnFocus={modal.returnFocus ?? null} /> : null}
    </AuthContext.Provider>
  );
}

