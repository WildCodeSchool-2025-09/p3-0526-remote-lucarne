import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router";
import PublicMobileHeader from "./PublicMobileHeader";
import PublicSidebar from "./PublicSidebar";
import { usePublicViewport } from "./publicResponsive";
import { publicStyles } from "./publicStyles";
import "./public.css";
import PublicFooter from "./PublicFooter";
import PublicSearchReturnLink from "./PublicSearchReturnLink";
import { publicNavigation } from "./publicRoutes";

function PublicLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const viewport = usePublicViewport();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    // Filter/pagination updates must not steal focus from the current field.
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    mainRef.current?.focus(location.pathname === publicNavigation.search ? { preventScroll: true } : undefined);
  }, [location.pathname]);

  // Reset disclosure state after any navigation or responsive mode change.
  const navigationKey = `${location.key}:${viewport}`;

  return (
    <div className={publicStyles.layout}>
      <a className={publicStyles.skipLink} href="#public-content" onClick={() => mainRef.current?.focus()}>
        Aller au contenu
      </a>
      {viewport !== "mobile" ? <PublicSidebar compact={viewport === "tablet"} key={navigationKey} onNavigate={() => mainRef.current?.focus()} /> : null}
      <div className={publicStyles.content}>
        {viewport === "mobile" ? <PublicMobileHeader key={navigationKey} onNavigate={() => mainRef.current?.focus()} /> : null}
        <main className={publicStyles.main} id="public-content" ref={mainRef} tabIndex={-1}>
          <PublicSearchReturnLink />
          {children}
        </main>
        <PublicFooter />
      </div>
    </div>
  );
}

export default PublicLayout;
