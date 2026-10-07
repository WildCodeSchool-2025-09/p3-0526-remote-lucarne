import { dashboardStyles } from "../../../components/dashboard/dashboardStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";

function DashboardPage() {
  return (
    <section className={dashboardStyles.page} aria-labelledby="dashboard-title">
      <div className={dashboardStyles.container}>
        <DashboardPageHeader headingId="dashboard-title" title="Administration" />
      </div>
    </section>
  );
}

export default DashboardPage;
