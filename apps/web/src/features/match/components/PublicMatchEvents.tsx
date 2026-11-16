import { Link } from "react-router";
import { EmptyState } from "../../../ui";
import PublicResourceState from "../../../components/public/PublicResourceState";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { usePublicMatchEvents } from "../../ranking/usePublicStatistics";

export default function PublicMatchEvents({ matchPublicId }: { matchPublicId: string }) {
  const query = usePublicMatchEvents(matchPublicId, true);
  return <section className="public-league-card"><h2>Buts renseignés</h2><PublicResourceState query={query} label="Buts du match" />
    {query.data?.length === 0 ? <EmptyState>Aucun but individuel renseigné pour ce match.</EmptyState> : null}
    {query.data && query.data.length > 0 ? <ol className="public-goal-events" aria-label="Buts renseignés du match">{query.data.map((event) => <li key={event.id}><span>{event.minute}′</span><Link to={publicNavigation.player(event.player.id)}>{event.player.firstName} {event.player.lastName}</Link></li>)}</ol> : null}
    <p className="public-secondary-line">La liste présente les événements enregistrés ; le score du match reste la référence du résultat.</p>
  </section>;
}
