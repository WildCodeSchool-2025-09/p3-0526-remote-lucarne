import { matchStyles } from "../matchStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { getCurrentAppRole, hasRole, MATCH_WRITE_ROLES } from "../../../auth/authRole";
import { Alert, Button, LoadingState } from "../../../ui";
import { useSeasonDetail } from "../../season/hooks/useSeasonDetail";
import MatchActions from "../components/MatchActions";
import { useMatch } from "../hooks/useMatches";
import { useMatchOptions } from "../hooks/useMatchOptions";
import { matchSchedule, matchScore, matchStatusLabels } from "../matchPresentation";

function MatchDetailPage() {
  const { matchId = "" } = useParams();
  const query = useMatch(matchId);
  const options = useMatchOptions();
  const [revision, setRevision] = useState(0);
  const season = useSeasonDetail(query.data?.seasonId ?? "");
  const match = query.data;
  const teamName = (id: string | null) =>
    id
      ? (options.teams.find((team) => team.id === id)?.name ?? "Équipe indisponible")
      : "Équipe à renseigner";
  const edition = season.data?.leagueSeasons.find(
    (item) => item.id === match?.leagueSeasonId,
  );
  const day = edition?.matchdays.find((item) => item.id === match?.matchdayId);
  const canWrite = hasRole(getCurrentAppRole(), MATCH_WRITE_ROLES);

  const pageName =
    (match
      ? `${teamName(match.homeTeamId)} – ${teamName(match.awayTeamId)}`
      : undefined) ?? "Match";
  const pageHeader = (
    <DashboardPageHeader
      resource="matches"
      mode="detail"
      resourceId={matchId}
      resourceName={pageName}
      headingId="match-detail-title"
      title={pageName}
    />
  );

  return (
    <section className={matchStyles.detailPage}>
      <div className={matchStyles.detailContainer}>
        {pageHeader}
        <Link className="lucarne-button lucarne-button--ghost" to="/dashboard/matches">
          ← Retour à la liste des matchs
        </Link>
        {query.isPending ? <LoadingState>Chargement du match…</LoadingState> : null}
        {query.isError ? (
          <Alert>
            {query.error.message}
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </Alert>
        ) : null}
        {options.isError || (match && season.isError) ? (
          <Alert>
            Impossible de charger le contexte du match.
            <Button
              onClick={() => {
                void options.reload();
                void season.refetch();
              }}
            >
              Réessayer le contexte
            </Button>
          </Alert>
        ) : null}
        {match ? (
          <>
            {match.isPublished ? (
              <Link
                className="lucarne-button lucarne-button--outline"
                to={`/matches/${match.matchPublicId}`}
              >
                Consulter la page publique du match
              </Link>
            ) : null}
            <section
              className={matchStyles.detailCard}
              aria-label="Informations du match"
            >
              <dl>
                <div>
                  <dt>Calendrier</dt>
                  <dd>
                    {season.data?.name ??
                      options.seasons.find((item) => item.id === match.seasonId)
                        ?.name}{" "}
                    ·{" "}
                    {edition?.league.name ??
                      options.leagues.find((item) => item.id === match.leagueId)?.name}
                  </dd>
                </div>
                <div>
                  <dt>Journée</dt>
                  <dd>
                    {day
                      ? `Journée ${day.number}${day.name ? ` · ${day.name}` : ""}`
                      : "Chargement…"}
                  </dd>
                </div>
                <div>
                  <dt>Programmation</dt>
                  <dd>{matchSchedule(match)}</dd>
                </div>
                <div>
                  <dt>Lieu</dt>
                  <dd>{match.stadium ?? "Non renseigné"}</dd>
                </div>
                <div>
                  <dt>Publication</dt>
                  <dd>{match.isPublished ? "Publié" : "Non publié"}</dd>
                </div>
                <div>
                  <dt>État</dt>
                  <dd>{matchStatusLabels[match.status]}</dd>
                </div>
                <div>
                  <dt>Résultat</dt>
                  <dd>{matchScore(match)}</dd>
                </div>
              </dl>
            </section>
            {canWrite ? (
              <>
                <Link
                  className="lucarne-button"
                  to={`/dashboard/matches/${matchId}/edit`}
                >
                  Modifier la programmation
                </Link>
                <MatchActions
                  key={revision}
                  match={match}
                  onReload={() => {
                    void query.refetch().then((result) => {
                      if (result.isSuccess) setRevision((value) => value + 1);
                    });
                  }}
                />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

export default MatchDetailPage;
