import { MAX_SEARCH_LENGTH } from "@lucarne/shared";
import { useSearchParams } from "react-router";
import PublicBreadcrumb from "../../../components/public/PublicBreadcrumb";
import { publicStyles } from "../../../components/public/publicStyles";
import { Alert, Button, EmptyState, Input, LoadingState } from "../../../ui";
import PublicLeagueDirectory from "../components/PublicLeagueDirectory";
import { usePublicLeagueNavigation } from "../hooks/usePublicLeagueNavigation";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();

function PublicLeagueListPage() {
  const query = usePublicLeagueNavigation();
  const [search, setSearch] = useSearchParams();
  const term = search.get("search") ?? "";
  const leagues = query.data?.filter((league) => normalize(`${league.name} ${league.country}`).includes(normalize(term))) ?? [];
  const countries = [...new Set(leagues.map((league) => league.country))].sort((a, b) => a.localeCompare(b, "fr"));

  return <section className={`${publicStyles.page} public-page-stack`}>
    <PublicBreadcrumb items={[{ label: "Ligues" }]} />
    <h1>Les ligues</h1>
    <label className="public-search-field">
      <span>Rechercher une ligue ou un pays</span>
      <Input maxLength={MAX_SEARCH_LENGTH} onChange={(event) => setSearch((current) => {
        const next = new URLSearchParams(current);
        if (event.target.value) next.set("search", event.target.value);
        else next.delete("search");
        return next;
      }, { replace: true })} type="search" value={term} />
    </label>
    {query.isPending ? <LoadingState>Chargement des ligues…</LoadingState> : null}
    {query.isError ? <Alert>Impossible de charger les ligues.
      <Button onClick={() => void query.refetch()} variant="outline">Réessayer</Button>
    </Alert> : null}
    {query.isSuccess ? <>
      <p role="status">{leagues.length} ligue{leagues.length > 1 ? "s" : ""}</p>
      {leagues.length === 0 ? <EmptyState>{term ? "Aucune ligue ne correspond à votre recherche." : "Aucune ligue active pour le moment."}</EmptyState> : null}
      {countries.map((country) => <section aria-label={`Ligues — ${country}`} className="public-league-card" key={country}>
        <h2>{country}</h2>
        <PublicLeagueDirectory leagues={leagues.filter((league) => league.country === country).sort((a, b) => a.name.localeCompare(b.name, "fr") || a.id.localeCompare(b.id))} />
      </section>)}
    </> : null}
  </section>;
}

export default PublicLeagueListPage;
