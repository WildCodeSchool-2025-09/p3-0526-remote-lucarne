import type { ReactNode } from "react";

type StatusBadgeVariant = "active" | "inactive";

interface StatusBadgeProps {
  children: ReactNode;
  variant: StatusBadgeVariant;
}

function StatusBadge({ children, variant }: StatusBadgeProps) {
  return <span className={`lucarne-status-badge lucarne-status-badge--${variant}`}>{children}</span>;
}

export { StatusBadge };
export type { StatusBadgeProps, StatusBadgeVariant };
