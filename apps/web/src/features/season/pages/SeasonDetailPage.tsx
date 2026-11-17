import { seasonStyles } from "../seasonStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole, SEASON_MANAGE_ROLES } from "../../../auth/authRole";
import { HttpError } from "../../../lib/httpClient";
import { formatDate } from "../../../lib/dateFormat";
import { formatDateTime } from "../../../lib/dateTimeFormat";
import { AlertModal } from "../../../ui";
import { useSeasonDetail } from "../hooks/useSeasonDetail";
import { ParticipationList } from "../components/SeasonParticipations";
import { SeasonMatchImport } from "../components/SeasonMatchImport";

function SeasonDetailPage() {
  const navigate = useNavigate();
  const { seasonId = "" } = useParams();
  const query = useSeasonDetail(seasonId);
  const role = getCurrentAppRole();
  const navigation = (
    <>
      <Link className="lucarne-button lucarne-button--ghost" to="/dashboard/seasons">
        ← Retour à la liste
      </Link>
    </>
  );

  const pageName = query.data?.name ?? "Saison";
  const pageHeader = (
    <DashboardPageHeader
      resource="seasons"
      mode="detail"
      resourceId={seasonId}
      resourceName={pageName}
      headingId="season-detail-title"
      title={pageName}
    />
  );

  if (query.isPending)
    return (
      <section className={seasonStyles.detailPage}>
        <div className={seasonStyles.detailContainer}>
          {pageHeader}
          {navigation}
          <p role="status">Chargement de la saison…</p>
        </div>
      </section>
    );

  if (query.isError)
    return (
      <section className={seasonStyles.detailPage}>
        <div className={seasonStyles.detailContainer}>
          {pageHeader}
          {navigation}
          <AlertModal onClose={() => void navigate("/dashboard/seasons")}>
            {query.error instanceof HttpError && query.error.status === 404
              ? "Cette saison est introuvable."
              : "Impossible de charger cette saison."}
          </AlertModal>
        </div>
      </section>
    );

  const season = query.data;

  if (!season)
    return (
      <section className={seasonStyles.detailPage}>
        <div className={seasonStyles.detailContainer}>
          {pageHeader}
          <AlertModal>Ressource introuvable.</AlertModal>
          <Link to="/dashboard/seasons">Retour à la liste</Link>
        </div>
      </section>
    );

  const canUpdate = hasRole(role, SEASON_MANAGE_ROLES);

  return (
    <section className={seasonStyles.detailPage} aria-labelledby="season-detail-title">
      <div className={seasonStyles.detailContainer}>
        {pageHeader}
        {navigation}
        <article className={seasonStyles.detailCard}>
          <dl>
            <div>
              <dt>Période</dt>
              <dd>
                {formatDate(season.startDate)} – {formatDate(season.endDate)}
              </dd>
            </div>
            <div>
              <dt>Date de création</dt>
              <dd>{formatDateTime(season.createdAt)}</dd>
            </div>
          </dl>
          <p>Cette période est commune à toutes les ligues associées.</p>
          {canUpdate ? (
            <Link
              className="lucarne-button lucarne-button--outline"
              to={`/dashboard/seasons/${season.id}/edit`}
            >
              Modifier
            </Link>
          ) : null}
        </article>
        {season.leagueSeasons.length === 0 ? (
          <p>Aucune ligue associée.</p>
        ) : (
          season.leagueSeasons.map((edition) => (
            <section key={edition.id}>
              <header className={seasonStyles.detailCard}>
                <h2>
                  <Link to={`/dashboard/leagues/${edition.leagueId}`}>
                    {edition.league.name}
                  </Link>
                </h2>
                <Link
                  className="lucarne-button lucarne-button--outline"
                  to={`/dashboard/matches?seasonId=${season.id}&leagueId=${edition.leagueId}`}
                >
                  Voir les matchs de cette ligue
                </Link>
                <dl>
                  <div>
                    <dt>Pays</dt>
                    <dd>{edition.league.country || "Non renseigné"}</dd>
                  </div>
                  <div>
                    <dt>Statut de la saison dans cette ligue</dt>
                    <dd>
                      {edition.isCurrent ? "Saison courante" : "Saison non courante"}
                    </dd>
                  </div>
                </dl>
              </header>
              {role === APP_ROLES.ADMIN ? (
                <div className={seasonStyles.detailCard}>
                  <SeasonMatchImport leagueId={edition.leagueId} seasonId={season.id} leagueName={edition.league.name} />
                </div>
              ) : null}
              <ParticipationList season={edition} />
              <section className={seasonStyles.detailCard}>
                <h3>Journées</h3>
                {edition.matchdays.length === 0 ? (
                  <p>Aucune journée.</p>
                ) : (
                  <ul>
                    {edition.matchdays.map((day) => (
                      <li key={day.id}>
                        <h4>Journée {day.number}</h4>
                        <Link
                          to={`/dashboard/matches?seasonId=${season.id}&leagueId=${edition.leagueId}&matchdayId=${day.id}`}
                        >
                          Voir les matchs de la journée {day.number}
                        </Link>
                        <dl>
                          <div>
                            <dt>Nom</dt>
                            <dd>{day.name || "Non renseigné"}</dd>
                          </div>
                          <div>
                            <dt>Date de début</dt>
                            <dd>
                              {day.startDate
                                ? formatDate(day.startDate)
                                : "Non renseignée"}
                            </dd>
                          </div>
                          <div>
                            <dt>Date de fin</dt>
                            <dd>
                              {day.endDate ? formatDate(day.endDate) : "Non renseignée"}
                            </dd>
                          </div>
                          <div>
                            <dt>Nombre de matchs</dt>
                            <dd>{day.matchCount}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

export default SeasonDetailPage;
