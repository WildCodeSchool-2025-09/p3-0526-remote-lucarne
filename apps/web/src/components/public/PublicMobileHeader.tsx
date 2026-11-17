import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import logoFull from "../../../docs/images/logo-blanc-sans-fond.png";
import { temporaryIcons } from "../../ui";
import { useAuth } from "../../features/auth/AuthContext";
import PublicAccountActions from "./PublicAccountActions";
import PublicNavigation from "./PublicNavigation";
import { publicNavigation } from "./publicRoutes";
import { publicStyles } from "./publicStyles";

function PublicMobileHeader({ onNavigate }: { onNavigate?: () => void }) {
  const { authenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const MenuIcon = temporaryIcons.menu;
  const navigate = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <header className={publicStyles.mobileHeader}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        className={publicStyles.menuButton}
        onClick={() => setIsOpen((open) => !open)}
        ref={menuButtonRef}
        type="button"
      >
        <MenuIcon aria-hidden="true" size={22} strokeWidth={2} />
      </button>
      <Link aria-label="Lucarne — Accueil" className={publicStyles.mobileBrand} onClick={navigate} to={publicNavigation.home}>
        <img alt="" className={publicStyles.mobileLogo} src={logoFull} />
      </Link>
      {!authenticated ? <PublicAccountActions compact onOpenAccount={() => setIsOpen(false)} placement="header" /> : <span aria-hidden="true" />}
      <div aria-hidden={!isOpen} className={publicStyles.mobilePanel} hidden={!isOpen} id={panelId} inert={!isOpen} ref={panelRef}>
        <PublicNavigation onNavigate={navigate} />
        {authenticated ? <PublicAccountActions onNavigate={() => {
          setIsOpen(false);
          menuButtonRef.current?.focus();
        }} /> : null}
      </div>
    </header>
  );
}

export default PublicMobileHeader;
