import { Link, useParams } from "react-router";
import PublicPersonProfile from "../../../components/public/PublicPersonProfile";
import PublicResourceState from "../../../components/public/PublicResourceState";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { usePublicPlayer } from "../usePublicPlayers";
import PublicPlayerStatisticsPanel from "../../ranking/PublicPlayerStatisticsPanel";

export default function PublicPlayerPage() {
  const { playerId = "" } = useParams();
  const query = usePublicPlayer(playerId);
  return <section className="public-resource-page public-page-stack"><PublicResourceState query={query} label="Joueuse" />
    {query.data ? <><PublicPersonProfile person={query.data} /><PublicPlayerStatisticsPanel playerId={query.data.id} /></> : <Link to={publicNavigation.players}>← Retour aux joueuses</Link>}
  </section>;
}
