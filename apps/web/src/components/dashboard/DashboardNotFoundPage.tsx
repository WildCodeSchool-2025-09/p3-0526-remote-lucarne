import { dashboardStyles } from "./dashboardStyles";
import { Link } from "react-router";
import DashboardPageHeader from "./DashboardPageHeader";

function DashboardNotFoundPage() {
  return (
    <section className={dashboardStyles.page}>
      <div className={dashboardStyles.container}>
        <DashboardPageHeader title="Page introuvable" />
        <Link to="/dashboard">Retour à l’administration</Link>
      </div>
    </section>
  );
}

export default DashboardNotFoundPage;
