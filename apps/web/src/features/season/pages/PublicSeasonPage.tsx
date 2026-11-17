import { Link, useParams } from "react-router";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import PublicEditions from "../../../components/public/PublicEditions";
import PublicResourceState from "../../../components/public/PublicResourceState";
import PublicShareButton from "../../../components/public/PublicShareButton";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { formatDate } from "../../../lib/dateFormat";
import { usePublicSeason } from "../hooks/usePublicSeasons";

export default function PublicSeasonPage() {
  const { seasonId = "" } = useParams();
  const query = usePublicSeason(seasonId);
  const season = query.data;
  return <section className="public-resource-page public-page-stack">
    <PublicBreadcrumb items={[{ label: "Ligues", to: publicNavigation.leagues }, { label: season?.name ?? "Saison" }]} />
    <Link to={publicNavigation.leagues}>← Retour aux ligues</Link>
    <PublicResourceState query={query} label="Saison" />
    {season ? <><h1>Saison {season.name}</h1><PublicShareButton /><p>Du {formatDate(season.startDate)} au {formatDate(season.endDate)}.</p>
      <section className="public-league-card"><h2>Compétitions de la saison</h2><PublicEditions editions={season.editions} /></section>
    </> : null}
  </section>;
}
