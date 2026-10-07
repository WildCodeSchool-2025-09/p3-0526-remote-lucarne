import { matchStyles } from "../matchStyles";
import { Link, useParams } from "react-router";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, EntityLogo, LoadingState } from "../../../ui";
import PublicMatchBreadcrumb from "../components/PublicMatchBreadcrumb";
import { usePublicMatch } from "../hooks/usePublicMatches";
import { matchSchedule, matchScore, matchStatusLabels } from "../matchPresentation";

function PublicMatchDetailPage() {
  const { matchPublicId = "" } = useParams();
  const query = usePublicMatch(matchPublicId);
  const match = query.data;

  return (
    <section className={matchStyles.publicPage}>
      <PublicMatchBreadcrumb detail />
      <Link className="lucarne-button lucarne-button--ghost" to="/matches">
        ← Retour au calendrier des matchs
      </Link>
      {query.isPending ? <LoadingState>Chargement du match…</LoadingState> : null}
      {query.isError ? (
        <Alert>
          {query.error instanceof HttpError && query.error.status === 404
            ? "Ce match est introuvable ou n’est plus disponible."
            : query.error instanceof HttpError && query.error.status === 400
              ? "Le lien de ce match est invalide."
              : "Impossible de charger ce match."}
          <Button onClick={() => void query.refetch()}>Réessayer</Button>
        </Alert>
      ) : null}
      {match ? (
        <>
          <h1>
            {match.homeTeam.name} – {match.awayTeam.name}
          </h1>
          <div className="my-6 flex flex-wrap items-center justify-center gap-6">
            <EntityLogo name={match.homeTeam.name} logoUrl={match.homeTeam.logoUrl} />
            <span>{matchScore(match)}</span>
            <EntityLogo name={match.awayTeam.name} logoUrl={match.awayTeam.logoUrl} />
          </div>
          <section className={matchStyles.detailCard} aria-label="Informations du match">
            <dl>
              <div>
                <dt>Ligue</dt>
                <dd>
                  {match.league.name} · {match.league.country}
                </dd>
              </div>
              <div>
                <dt>Saison</dt>
                <dd>{match.season.name}</dd>
              </div>
              <div>
                <dt>Journée</dt>
                <dd>
                  Journée {match.matchday.number}
                  {match.matchday.name ? ` · ${match.matchday.name}` : ""}
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
                <dt>État</dt>
                <dd>{matchStatusLabels[match.status]}</dd>
              </div>
              <div>
                <dt>Résultat</dt>
                <dd>{matchScore(match)}</dd>
              </div>
            </dl>
          </section>
        </>
      ) : null}
    </section>
  );
}

export default PublicMatchDetailPage;
