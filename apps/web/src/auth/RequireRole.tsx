import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { Alert, Button } from "../ui";
import { getCurrentAppRole, hasRole } from "./authRole";
import type { AppRole } from "./authRole";
import DashboardPageHeader from "../components/dashboard/DashboardPageHeader";
import { dashboardResources, type DashboardResource } from "../components/dashboard/dashboardResources";

interface RequireRoleProps {
  allowedRoles: readonly AppRole[];
  children: ReactNode;
}

function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getCurrentAppRole();

  if (hasRole(role, allowedRoles)) {
    return children;
  }

  const isAuthenticated = role != null;
  const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const resource = Object.entries(dashboardResources).find(([, item]) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))?.[0] as DashboardResource | undefined;
  const segments = location.pathname.split("/");
  const mode = segments[3] === "new" ? "create" : segments[4] === "edit" ? "edit" : segments[3] ? "detail" : "list";
  const title = isAuthenticated ? "Accès refusé" : "Authentification requise";

  return (
    <section className="auth-state-page" aria-labelledby="auth-state-title">
      <div className="auth-state-page__container">
        {isDashboard ? <DashboardPageHeader headingId="auth-state-title" title={title} resource={resource} resourceId={segments[3]} mode={mode} /> : <h1 id="auth-state-title">{title}</h1>}
        <Alert variant="danger">
          {isAuthenticated
            ? "Vous n’avez pas les droits nécessaires pour accéder à cette page."
            : "Vous devez être connecté pour accéder à cette page."}
        </Alert>
        <Button
          onClick={() => {
            void navigate(isDashboard && isAuthenticated ? "/dashboard" : "/");
          }}
          variant="ghost"
        >
          {isAuthenticated && isDashboard ? "← Retour à l’administration" : "← Retour à l’accueil"}
        </Button>
      </div>
    </section>
  );
}

export { RequireRole };
export type { RequireRoleProps };
