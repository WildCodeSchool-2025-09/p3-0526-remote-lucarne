import { dashboardStyles } from "./dashboardStyles";
import { Link } from "react-router";
import { temporaryIcons } from "../../ui";
import { dashboardResources, type DashboardResource } from "./dashboardResources";

type DashboardNavigationItemKey = DashboardResource;

type DashboardNavigationItem = {
  key: DashboardNavigationItemKey;
  label: string;
  to: string;
  icon: keyof typeof temporaryIcons;
};

const navigationItems: DashboardNavigationItem[] = [
  {
    key: "matches",
    label: "Matchs",
    icon: "matches",
    to: dashboardResources.matches.path,
  },
  {
    key: "leagues",
    label: "Ligues",
    icon: "leagues",
    to: dashboardResources.leagues.path,
  },
  {
    key: "seasons",
    label: "Saisons",
    icon: "seasons",
    to: dashboardResources.seasons.path,
  },
  { key: "teams", label: "Équipes", icon: "teams", to: dashboardResources.teams.path },
  {
    key: "players",
    label: "Joueuses",
    icon: "players",
    to: dashboardResources.players.path,
  },
  { key: "staff", label: "Staff", icon: "staff", to: dashboardResources.staff.path },
];

interface DashboardNavigationProps {
  activeItem?: DashboardNavigationItemKey;
  onNavigate?: () => void;
}

function DashboardNavigation({ activeItem, onNavigate }: DashboardNavigationProps) {
  return (
    <nav aria-label="Navigation du dashboard" className="grid gap-1.5">
      {navigationItems.map((item) => {
        const Icon = temporaryIcons[item.icon];
        const isActive = item.key === activeItem;
        const className = `${dashboardStyles.navigationLink} ${isActive ? dashboardStyles.activeLink : dashboardStyles.inactiveLink}`;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={className}
            key={item.key}
            onClick={onNavigate}
            to={item.to}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default DashboardNavigation;

export type { DashboardNavigationItemKey };
