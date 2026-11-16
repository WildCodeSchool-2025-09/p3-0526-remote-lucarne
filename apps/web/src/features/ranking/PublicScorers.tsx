import type { PublicLeagueStatistics } from "@lucarne/shared";
import { Link } from "react-router";
import PublicLeagueLogo from "../league/components/PublicLeagueLogo";
import { EmptyState, Pagination } from "../../ui";
import { publicNavigation } from "../../components/public/publicRoutes";

export default function PublicScorers({ scorers, onPageChange }: { scorers: PublicLeagueStatistics["scorers"]; onPageChange?: (page: number) => void }) {
  return <section><h3>Meilleures buteuses</h3><p className="public-secondary-line">Buts individuels renseignés dans les événements des matchs terminés.</p>
    {scorers.data.length ? <ol className="public-person-list" aria-label="Meilleures buteuses">{scorers.data.map((row) => <li key={row.player.id}><Link to={publicNavigation.player(row.player.id)}><PublicLeagueLogo name={`${row.player.firstName} ${row.player.lastName}`} logoUrl={row.player.pictureUrl} /><span>{row.rank}. {row.player.firstName} {row.player.lastName}<small className="public-secondary-line">{row.player.team.name} · Équipe actuelle</small></span><strong>{row.goals} but{row.goals > 1 ? "s" : ""}</strong></Link></li>)}</ol> : <EmptyState>Aucun but individuel renseigné pour cette édition.</EmptyState>}
    {onPageChange && scorers.pagination.totalPages > 1 ? <Pagination label="Pagination des buteuses" page={scorers.pagination.page} totalPages={scorers.pagination.totalPages} onPageChange={onPageChange} /> : null}
  </section>;
}
