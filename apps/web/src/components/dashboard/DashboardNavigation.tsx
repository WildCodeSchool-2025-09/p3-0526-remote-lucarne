import { Link } from "react-router";
import { temporaryIcons } from "../../ui";

type DashboardNavigationItemKey = "leagues" | "teams" | "players" | "staff";

type DashboardNavigationItem = {
  key: DashboardNavigationItemKey;
  label: string;
  to: string;
  icon: keyof typeof temporaryIcons;
};

const navigationItems: DashboardNavigationItem[] = [
  { key: "leagues", label: "Ligues", icon: "leagues", to: "/dashboard/leagues" },
  { key: "teams", label: "Équipes", icon: "teams", to: "/dashboard/teams" },
  { key: "players", label: "Joueuses", icon: "players", to: "/dashboard/players" },
  { key: "staff", label: "Staff", icon: "staff", to: "/dashboard/staff-members" },
];

interface DashboardNavigationProps {
  activeItem: DashboardNavigationItemKey;
  onNavigate?: () => void;
}

function DashboardNavigation({ activeItem, onNavigate }: DashboardNavigationProps) {
  return (
    <nav aria-label="Navigation du dashboard" className="dashboard-navigation">
      {navigationItems.map((item) => {
        const Icon = temporaryIcons[item.icon];
        const className = `dashboard-navigation__item${item.key === activeItem ? " dashboard-navigation__item--active" : ""}`;

        return (
          <Link
            aria-current={item.key === activeItem ? "page" : undefined}
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
