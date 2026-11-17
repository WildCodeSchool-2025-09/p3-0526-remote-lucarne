import { NavLink } from "react-router";
import { temporaryIcons } from "../../ui";
import PublicLeagueNavigation from "../../features/league/components/PublicLeagueNavigation";
import { publicNavigation } from "./publicRoutes";
import { publicStyles } from "./publicStyles";

interface PublicNavigationProps {
  compact?: boolean;
  onNavigate?: () => void;
}

function PublicNavigation({ compact = false, onNavigate }: PublicNavigationProps) {
  const CalendarIcon = temporaryIcons.calendar;
  const SearchIcon = temporaryIcons.search;
  const HomeIcon = temporaryIcons.dashboard;
  const itemStyle = `${publicStyles.navigationItem} ${compact ? publicStyles.compactItem : ""}`;
  const labelStyle = compact ? "sr-only" : publicStyles.label;

  return (
    <nav aria-label="Navigation publique">
      <ul className={publicStyles.list}>
        <li>
          <NavLink className={({ isActive }) => `${itemStyle} ${isActive ? publicStyles.activeItem : publicStyles.inactiveItem}`}
            end onClick={onNavigate} title={compact ? "Accueil" : undefined} to={publicNavigation.home}>
            <HomeIcon aria-hidden="true" className="shrink-0" size={20} />
            <span className={labelStyle}>Accueil</span>
          </NavLink>
        </li>
        <PublicLeagueNavigation compact={compact} onNavigate={onNavigate} />
        <li>
          <NavLink
            className={({ isActive }) => `${itemStyle} ${isActive ? publicStyles.activeItem : publicStyles.inactiveItem}`}
            onClick={onNavigate}
            title={compact ? "Calendrier" : undefined}
            to={publicNavigation.calendar}
          >
            <CalendarIcon aria-hidden="true" className="shrink-0" size={20} strokeWidth={2} />
            <span className={labelStyle}>Calendrier</span>
          </NavLink>
        </li>
        <li>
          <NavLink className={({ isActive }) => `${itemStyle} ${isActive ? publicStyles.activeItem : publicStyles.inactiveItem}`} onClick={onNavigate} title={compact ? "Recherche" : undefined} to={publicNavigation.search}>
            <SearchIcon aria-hidden="true" className="shrink-0" size={20} strokeWidth={2} />
            <span className={labelStyle}>Recherche</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default PublicNavigation;
