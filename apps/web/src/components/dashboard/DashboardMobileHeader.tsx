import { dashboardStyles } from "./dashboardStyles";
import { useEffect, useRef, useState } from "react";
import logoFull from "../../../docs/images/logo-blanc-sans-fond.png";
import { temporaryIcons } from "../../ui";
import DashboardNavigation, {
  type DashboardNavigationItemKey,
} from "./DashboardNavigation";

interface DashboardMobileHeaderProps {
  activeItem?: DashboardNavigationItemKey;
}

function DashboardMobileHeader({ activeItem }: DashboardMobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const MenuIcon = temporaryIcons.menu;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setIsOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <header className={dashboardStyles.mobileHeader}>
      <button
        aria-controls="dashboard-mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        className={dashboardStyles.menuButton}
        onClick={() => setIsOpen((open) => !open)}
        ref={menuButtonRef}
        type="button"
      >
        <MenuIcon aria-hidden="true" size={22} strokeWidth={2} />
      </button>
      <img alt="Lucarne" className={dashboardStyles.mobileLogo} src={logoFull} />
      <span aria-hidden="true" />
      <div
        aria-hidden={!isOpen}
        className={`${dashboardStyles.mobileNavigation} ${isOpen ? dashboardStyles.mobileNavigationOpen : dashboardStyles.mobileNavigationClosed}`}
        id="dashboard-mobile-navigation"
        inert={!isOpen}
      >
        <DashboardNavigation
          activeItem={activeItem}
          onNavigate={() => setIsOpen(false)}
        />
      </div>
    </header>
  );
}

export default DashboardMobileHeader;
