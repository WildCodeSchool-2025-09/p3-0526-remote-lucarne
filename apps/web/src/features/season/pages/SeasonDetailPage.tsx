import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole } from "../../../auth/authRole";
import { HttpError } from "../../../lib/httpClient";
import { formatDate } from "../../../lib/dateFormat";
import { AlertModal, Button } from "../../../ui";
import { useSetCurrentSeason } from "../hooks/useSetCurrentSeason";
import { useSeasonDetail } from "../hooks/useSeasonDetail";
import SeasonStatusBadge from "../components/SeasonStatusBadge";
import SeasonParticipations from "../components/SeasonParticipations";

function SeasonDetailPage() {
  const navigate = useNavigate();
  const { seasonId = "" } = useParams();
  const query = useSeasonDetail(seasonId);
  const season = query.data;
  const role = getCurrentAppRole();
  const setCurrent = useSetCurrentSeason();

  if (query.isPending) return <section className="league-detail-page"><div className="league-detail-page__container"><p role="status">Chargement de la saison…</p></div></section>;
  if (query.isError) return <section className="league-detail-page"><div className="league-detail-page__container"><AlertModal onClose={() => void navigate(-1)}>{query.error instanceof HttpError && query.error.status === 404 ? "Cette saison est introuvable." : "Impossible de charger cette saison."}</AlertModal></div></section>;
  if (!season) return null;

  const canUpdate = role === APP_ROLES.ADMIN || role === APP_ROLES.EDITOR;
  const canSetCurrent = role === APP_ROLES.ADMIN && season.status !== "CURRENT";

  return <section className="league-detail-page" aria-labelledby="season-detail-title"><div className="league-detail-page__container"><Button onClick={() => void navigate(-1)} variant="ghost">← Retour à la liste</Button><article className="league-detail-card"><header><p className="league-list-page__eyebrow">Détail d’une saison</p><h1 id="season-detail-title">{season.name}</h1><SeasonStatusBadge status={season.status} /></header><div className="league-detail-card__content"><dl><div><dt>Ligue</dt><dd><Link to={`/dashboard/leagues/${season.league.id}`}>{season.league.name}</Link></dd></div><div><dt>Période</dt><dd>{formatDate(season.startDate)} – {formatDate(season.endDate)}</dd></div><div><dt>Équipes participantes</dt><dd>{season.participatingTeams.length}</dd></div><div><dt>Journées</dt><dd>{season.matchdays.length}</dd></div></dl></div><div className="league-detail-card__actions">{canUpdate ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/seasons/${season.id}/edit`}>Modifier</Link> : null}{canSetCurrent ? <Button disabled={setCurrent.isPending} onClick={() => void setCurrent.mutateAsync({ leagueId: season.leagueId, seasonId: season.id })} variant="outline">Définir comme courante</Button> : null}</div></article><SeasonParticipations season={season} /><section className="league-detail-card"><h2>Journées</h2>{season.matchdays.length === 0 ? <p>Aucune journée.</p> : <ul>{season.matchdays.map((matchday) => <li key={matchday.id}>Journée {matchday.number}{matchday.name ? ` — ${matchday.name}` : ""} ({matchday.matchCount} match(s))</li>)}</ul>}</section></div></section>;
}

export default SeasonDetailPage;
