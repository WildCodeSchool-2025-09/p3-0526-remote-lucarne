import type { ReactNode } from "react";

interface EmptyStateProps {
  action?: ReactNode;
  children: ReactNode;
}

function EmptyState({ action, children }: EmptyStateProps) {
  return (
    <div className="lucarne-empty-state">
      <p>{children}</p>
      {action}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
