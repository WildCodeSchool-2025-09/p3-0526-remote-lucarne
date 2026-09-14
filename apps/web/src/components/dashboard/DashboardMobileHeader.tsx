import { useState } from "react";
import logoFull from "../../../docs/images/logo-blanc-sans-fond.png";
import { temporaryIcons } from "../../ui";
import DashboardNavigation, { type DashboardNavigationItemKey } from "./DashboardNavigation";

interface DashboardMobileHeaderProps {
  activeItem: DashboardNavigationItemKey;
}

function DashboardMobileHeader({ activeItem }: DashboardMobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const MenuIcon = temporaryIcons.menu;

  return (
    <header className="dashboard-mobile-header">
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        className="dashboard-mobile-header__menu"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <MenuIcon aria-hidden="true" size={22} strokeWidth={2} />
      </button>
      <img alt="Lucarne" className="dashboard-mobile-header__logo" src={logoFull} />
      <span aria-hidden="true" className="dashboard-mobile-header__spacer" />
      <div className={`dashboard-mobile-header__navigation${isOpen ? " dashboard-mobile-header__navigation--open" : ""}`}>
        <DashboardNavigation activeItem={activeItem} />
      </div>
    </header>
  );
}

export default DashboardMobileHeader;
