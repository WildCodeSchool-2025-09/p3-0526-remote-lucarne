import { Link } from "react-router";

function PublicMatchBreadcrumb({ detail = false }: { detail?: boolean }) {
  return (
    <nav aria-label="Fil d’Ariane">
      <p
        className={
          "m-0 mb-2 text-[13px] text-[var(--color-text-secondary)] [&_strong]:text-[var(--color-text-primary)]"
        }
      >
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        {detail ? (
          <>
            <Link to="/matches">Matchs</Link>
            <span aria-hidden="true"> / </span>
            <strong aria-current="page">Match</strong>
          </>
        ) : (
          <strong aria-current="page">Matchs</strong>
        )}
      </p>
    </nav>
  );
}

export default PublicMatchBreadcrumb;
