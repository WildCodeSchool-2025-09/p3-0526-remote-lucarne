import { Link } from "react-router";
import type { PublicEdition } from "@lucarne/shared";
import { EmptyState } from "../../ui";
import PublicLeagueLogo from "../../features/league/components/PublicLeagueLogo";
import { publicNavigation } from "./publicRoutes";

export default function PublicEditions({ editions }: { editions: PublicEdition[] }) {
  if (!editions.length) return <EmptyState>Aucune compétition disponible.</EmptyState>;
  return <ul className="public-league-directory" aria-label="Compétitions">
    {editions.map(({ league, season, isCurrent }) => <li key={`${league.id}/${season.id}`}>
      <Link to={`${publicNavigation.league(league.slug)}?${new URLSearchParams({ seasonId: season.id })}`}>
        <PublicLeagueLogo logoUrl={league.logoUrl} name={league.name} />
        <span>{league.name}<small className="public-secondary-line">{league.country} · {season.name}{isCurrent ? " · Saison courante" : ""}</small></span>
      </Link>
    </li>)}
  </ul>;
}
