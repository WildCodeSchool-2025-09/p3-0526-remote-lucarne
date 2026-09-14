interface LoadingStateProps {
  children?: string;
}

function LoadingState({ children = "Chargement…" }: LoadingStateProps) {
  return <p className="lucarne-loading-state" role="status">{children}</p>;
}

export { LoadingState };
export type { LoadingStateProps };
