import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Alert, Button } from "../ui";
import { getCurrentAppRole, hasRole } from "./authRole";
import type { AppRole } from "./authRole";

interface RequireRoleProps {
  allowedRoles: readonly AppRole[];
  children: ReactNode;
}

function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const navigate = useNavigate();
  const role = getCurrentAppRole();

  if (hasRole(role, allowedRoles)) {
    return children;
  }

  const isAuthenticated = role != null;

  return (
    <section className="auth-state-page" aria-labelledby="auth-state-title">
      <div className="auth-state-page__container">
        <h1 id="auth-state-title">
          {isAuthenticated ? "Accès refusé" : "Authentification requise"}
        </h1>
        <Alert variant="danger">
          {isAuthenticated
            ? "Vous n’avez pas les droits nécessaires pour créer une ligue."
            : "Vous devez être connecté pour accéder à cette page."}
        </Alert>
        <Button
          onClick={() => {
            void navigate(-1);
          }}
          variant="ghost"
        >
          ← Retour
        </Button>
      </div>
    </section>
  );
}

export { RequireRole };
export type { RequireRoleProps };
