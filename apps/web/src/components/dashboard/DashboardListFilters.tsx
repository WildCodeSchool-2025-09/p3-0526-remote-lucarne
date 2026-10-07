import { dashboardStyles } from "./dashboardStyles";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { temporaryIcons } from "../../ui";

interface DashboardListFiltersProps {
  activeCount?: number;
  children: ReactNode;
  label: string;
  mobileAction?: ReactNode;
}

function DashboardListFilters({
  activeCount = 0,
  children,
  label,
  mobileAction,
}: DashboardListFiltersProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const contentId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const ChevronIcon = temporaryIcons.chevron;
  const FilterIcon = temporaryIcons.filter;

  useEffect(() => {
    if (!isMobileOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setIsMobileOpen(false);
      toggleRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileOpen]);

  const activeLabel =
    activeCount > 0 ? `, ${activeCount} actif${activeCount > 1 ? "s" : ""}` : "";

  return (
    <div aria-label={label} className={dashboardStyles.filters} role="group">
      <button
        aria-controls={contentId}
        aria-expanded={isMobileOpen}
        aria-label={`${isMobileOpen ? "Masquer" : "Afficher"} les filtres${activeLabel}`}
        className={dashboardStyles.filtersToggle}
        onClick={() => setIsMobileOpen((isOpen) => !isOpen)}
        ref={toggleRef}
        type="button"
      >
        <span className="flex items-center gap-2">
          <FilterIcon aria-hidden="true" size={18} />
          Filtres
        </span>
        <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-secondary)]">
          {activeCount > 0 ? (
            <span>
              {activeCount} actif{activeCount > 1 ? "s" : ""}
            </span>
          ) : null}
          <ChevronIcon
            aria-hidden="true"
            className={`${dashboardStyles.filtersChevron} ${isMobileOpen ? "dashboard-mobile:rotate-180" : ""}`}
            size={18}
          />
        </span>
      </button>
      <div
        className={
          isMobileOpen
            ? dashboardStyles.filtersBodyOpen
            : dashboardStyles.filtersBodyClosed
        }
        id={contentId}
      >
        {children}
      </div>
      {mobileAction}
    </div>
  );
}

export default DashboardListFilters;

export type { DashboardListFiltersProps };
