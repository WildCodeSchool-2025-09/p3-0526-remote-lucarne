import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Ellipsis,
  Goal,
  LayoutDashboard,
  Menu,
  Search,
  Shield,
  SlidersHorizontal,
  Trophy,
  UserRound,
  UsersRound,
  Volleyball,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Temporary icon registry for the dashboard League work.
 * Keep consumers dependent on these semantic names so the icon set can be
 * replaced without changing every page and component.
 */
const temporaryIcons = {
  dashboard: LayoutDashboard,
  leagues: Trophy,
  seasons: CalendarDays,
  teams: Shield,
  players: UsersRound,
  staff: BriefcaseBusiness,
  matches: Goal,
  search: Search,
  filter: SlidersHorizontal,
  calendar: CalendarDays,
  user: UserRound,
  menu: Menu,
  mobileMenu: Menu,
  chevron: ChevronDown,
  actions: Ellipsis,
  ball: Volleyball,
} as const satisfies Record<string, LucideIcon>;

export { temporaryIcons };
export type { LucideIcon };
