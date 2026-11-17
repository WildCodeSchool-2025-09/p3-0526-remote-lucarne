import { dashboardStyles } from "./dashboardStyles";
import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import DashboardPageHeader from "./DashboardPageHeader";

function DashboardRouteErrorPage() {
  const error = useRouteError();

  return (
    <section className={dashboardStyles.page}>
      <div className={dashboardStyles.container}>
        <DashboardPageHeader title="Impossible de charger cette page" />
        <p role="alert">
          {isRouteErrorResponse(error) && error.status === 404
            ? "Cette page est introuvable."
            : "Une erreur est survenue. Réessayez de charger la page."}
        </p>
        <Link to="/dashboard">Retour à l’administration</Link>
      </div>
    </section>
  );
}

export default DashboardRouteErrorPage;
