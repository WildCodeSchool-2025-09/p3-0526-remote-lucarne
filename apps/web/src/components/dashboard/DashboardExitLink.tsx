import { Link } from "react-router";
import { temporaryIcons } from "../../ui";
import { publicNavigation } from "../public/publicRoutes";
import { dashboardStyles } from "./dashboardStyles";

function DashboardExitLink({ onNavigate }: { onNavigate?: () => void }) {
  const UserIcon = temporaryIcons.user;

  return (
    <Link
      aria-label="Quitter le dashboard"
      className={dashboardStyles.exitLink}
      onClick={onNavigate}
      title="Quitter le dashboard"
      to={publicNavigation.home}
    >
      <UserIcon aria-hidden="true" className="shrink-0" size={20} strokeWidth={2} />
      <span className="min-w-0 [overflow-wrap:anywhere] dashboard-tablet:hidden">Quitter le dashboard</span>
    </Link>
  );
}

export default DashboardExitLink;
