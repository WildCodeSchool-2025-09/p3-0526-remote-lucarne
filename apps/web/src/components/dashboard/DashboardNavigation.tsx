import { Link } from "react-router";
import { temporaryIcons } from "../../ui";

type DashboardNavigationItemKey = "dashboard" | "leagues" | "seasons" | "teams" | "players" | "staff" | "matches";

type DashboardNavigationItem = {
  key: DashboardNavigationItemKey;
  label: string;
  to?: string;
  icon: keyof typeof temporaryIcons;
};

const navigationItems: DashboardNavigationItem[] = [
  { key: "dashboard", label: "Tableau de bord", icon: "dashboard", to: "/dashboard" },
  { key: "leagues", label: "Ligues", icon: "leagues", to: "/dashboard/league" },
  { key: "seasons", label: "Saisons", icon: "seasons", to: "/dashboard/seasons" },
  { key: "teams", label: "Ã‰quipes", icon: "teams", to: "/dashboard/teams" },
  { key: "players", label: "Joueuses", icon: "players", to: "/dashboard/players" },
  { key: "staff", label: "Staff", icon: "staff", to: "/dashboard/staff-members" },
  { key: "matches", label: "Matchs", icon: "matches", to: "/dashboard/matches" },
];

interface DashboardNavigationProps {
  activeItem: DashboardNavigationItemKey;
}

function DashboardNavigation({ activeItem }: DashboardNavigationProps) {
  return (
    <nav aria-label="Navigation du dashboard" className="dashboard-navigation">
      {navigationItems.map((item) => {
        const Icon = temporaryIcons[item.icon];
        const className = `dashboard-navigation__item${item.key === activeItem ? " dashboard-navigation__item--active" : ""}`;

        return item.to != null ? (
          <Link className={className} key={item.key} to={item.to}>
            <Icon aria-hidden="true" size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        ) : (
          <span className={className} key={item.key}>
            <Icon aria-hidden="true" size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </span>
        );
      })}
    </nav>
  );
}

export default DashboardNavigation;
export type { DashboardNavigationItemKey };
