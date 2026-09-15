import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { temporaryIcons } from "../../ui";

interface DashboardListFiltersProps {
  activeCount?: number;
  children: ReactNode;
  label: string;
  mobileAction?: ReactNode;
}

function DashboardListFilters({ activeCount = 0, children, label, mobileAction }: DashboardListFiltersProps) {
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

  const activeLabel = activeCount > 0 ? `, ${activeCount} actif${activeCount > 1 ? "s" : ""}` : "";

  return (
    <div aria-label={label} className="dashboard-list__filters" role="group">
      <button
        aria-controls={contentId}
        aria-expanded={isMobileOpen}
        aria-label={`${isMobileOpen ? "Masquer" : "Afficher"} les filtres${activeLabel}`}
        className="dashboard-list__filters-toggle"
        onClick={() => setIsMobileOpen((isOpen) => !isOpen)}
        ref={toggleRef}
        type="button"
      >
        <span className="dashboard-list__filters-toggle-label">
          <FilterIcon aria-hidden="true" size={18} />
          Filtres
        </span>
        <span className="dashboard-list__filters-toggle-meta">
          {activeCount > 0 ? <span>{activeCount} actif{activeCount > 1 ? "s" : ""}</span> : null}
          <ChevronIcon
            aria-hidden="true"
            className={`dashboard-list__filters-chevron${isMobileOpen ? " dashboard-list__filters-chevron--open" : ""}`}
            size={18}
          />
        </span>
      </button>
      <div
        className={`dashboard-list__filters-body${isMobileOpen ? " dashboard-list__filters-body--open" : ""}`}
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
