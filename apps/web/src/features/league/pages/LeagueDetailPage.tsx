import { useNavigate, useParams } from "react-router";
import { Alert, Button } from "../../../ui";
import { HttpError } from "../../../lib/httpClient";
import { useLeagueDetail } from "../hooks/useLeagueDetail";
import { formatDate, getStatus } from "../utils/leagueList";

function isNotFoundError(error: unknown): boolean {
  return error instanceof HttpError
    ? error.status === 404
    : typeof error === "object" && error != null && "status" in error && error.status === 404;
}

function LeagueDetailPage() {
  const navigate = useNavigate();
  const { leagueId = "" } = useParams();
  const query = useLeagueDetail(leagueId);

  return (
    <section className="league-detail-page" aria-labelledby="league-detail-title">
      <div className="league-detail-page__container">
        <Button onClick={() => void navigate(-1)} variant="ghost">← Retour à la liste</Button>

        {query.isPending ? <p role="status">Chargement de la ligue…</p> : null}
        {query.isError ? (
          <div className="league-list__state">
            <Alert>
              {isNotFoundError(query.error)
                ? "Cette ligue n’existe plus ou a déjà été supprimée."
                : "Impossible de charger cette ligue."}
            </Alert>
            <Button onClick={() => void navigate(-1)} variant="outline">Retour à la liste</Button>
          </div>
        ) : null}

        {query.isSuccess ? (
          <article className="league-detail-card">
            <header>
              <p className="league-list-page__eyebrow">Détail d’une ligue</p>
              <h1 id="league-detail-title">{query.data.name}</h1>
            </header>
            <div className="league-detail-card__content">
              {query.data.logoUrl ? <img alt={`Logo de ${query.data.name}`} className="league-detail-card__logo" src={query.data.logoUrl} /> : <span aria-label={`Initiale de ${query.data.name}`} className="league-detail-card__logo league-detail-card__logo--placeholder">{query.data.name.charAt(0).toUpperCase()}</span>}
              <dl>
                <div><dt>Pays</dt><dd>{query.data.country}</dd></div>
                <div><dt>Statut</dt><dd>{getStatus(query.data) === "ACTIVE" ? "Active" : "Inactive"}</dd></div>
                <div><dt>Date de création</dt><dd>{formatDate(query.data.createdAt)}</dd></div>
              </dl>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

export default LeagueDetailPage;
