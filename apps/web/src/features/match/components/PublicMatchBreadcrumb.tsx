import { Link } from "react-router";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import { publicNavigation } from "../../../components/public/publicRoutes";

function PublicMatchBreadcrumb({ detail = false, returnTo = "/matches", leagueName = "Ligue" }: { detail?: boolean; returnTo?: string; leagueName?: string }) {
  const leagueSlug = /^\/leagues\/([a-z0-9]+(?:-[a-z0-9]+)*)\/matches(?:\?|$)/.exec(returnTo)?.[1];
  if (detail && leagueSlug) {
    const seasonId = new URL(returnTo, window.location.origin).searchParams.get("seasonId");
    const leaguePath = `${publicNavigation.league(leagueSlug)}${seasonId ? `?${new URLSearchParams({ seasonId })}` : ""}`;
    return <PublicBreadcrumb items={[
      { label: "Ligues", to: publicNavigation.leagues },
      { label: leagueName, to: leaguePath },
      { label: "Calendrier", to: returnTo },
      { label: "Match" },
    ]} />;
  }
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
            <Link to={returnTo}>Matchs</Link>
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
