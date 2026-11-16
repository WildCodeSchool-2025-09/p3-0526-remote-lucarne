import { matchStyles } from "../matchStyles";
import { Link, useParams, useSearchParams } from "react-router";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button, EntityLogo, LoadingState } from "../../../ui";
import PublicMatchBreadcrumb from "../components/PublicMatchBreadcrumb";
import { usePublicMatch } from "../hooks/usePublicMatches";
import { matchSchedule, matchScore, matchStatusLabels } from "../matchPresentation";
import { publicMatchReturnPath } from "../publicMatchNavigation";
import PublicShareButton from "../../../components/public/PublicShareButton";
import { publicNavigation } from "../../../components/public/publicRoutes";
import PublicMatchEvents from "../components/PublicMatchEvents";

function PublicMatchDetailPage() {
  const { matchPublicId = "" } = useParams();
  const [search] = useSearchParams();
  const returnTo = publicMatchReturnPath(search.get("returnTo"));
  const query = usePublicMatch(matchPublicId);
  const match = query.data;

  return (
    <section className={`${matchStyles.publicPage} public-page-stack`}>
      <PublicMatchBreadcrumb detail leagueName={match?.league.name} returnTo={returnTo} />
      <Link className="lucarne-button lucarne-button--ghost justify-self-start" to={returnTo}>
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
          <header className="public-resource-header">
            <h1>{match.homeTeam.name} – {match.awayTeam.name}</h1>
            <PublicShareButton />
          </header>
          <div className="public-match-summary">
            <div className="public-match-summary__team"><EntityLogo name={match.homeTeam.name} logoUrl={match.homeTeam.logoUrl} />{match.homeTeam.id ? <Link to={publicNavigation.team(match.homeTeam.id)}>{match.homeTeam.name}</Link> : match.homeTeam.name}</div>
            <div className="public-match-summary__result"><strong className={match.result.homeScore === null ? "public-match-summary__missing" : undefined}>{matchScore(match)}</strong><span>{matchStatusLabels[match.status]}</span></div>
            <div className="public-match-summary__team"><EntityLogo name={match.awayTeam.name} logoUrl={match.awayTeam.logoUrl} />{match.awayTeam.id ? <Link to={publicNavigation.team(match.awayTeam.id)}>{match.awayTeam.name}</Link> : match.awayTeam.name}</div>
          </div>
          <PublicMatchEvents matchPublicId={match.matchPublicId} />
          <section className={matchStyles.detailCard} aria-label="Informations du match">
            <dl>
              <div>
                <dt>Ligue</dt>
                <dd>
                  {match.league.slug ? <Link to={`${publicNavigation.league(match.league.slug)}${match.season.id ? `?${new URLSearchParams({ seasonId: match.season.id })}` : ""}`}>{match.league.name}</Link> : match.league.name} · {match.league.country}
                </dd>
              </div>
              <div>
                <dt>Saison</dt>
                <dd>{match.season.id ? <Link to={publicNavigation.season(match.season.id)}>{match.season.name}</Link> : match.season.name}</dd>
              </div>
              <div>
                <dt>Journée</dt>
                <dd>
                  {match.matchday.id ? <Link to={publicNavigation.matchday(match.matchday.id)}>Journée {match.matchday.number}</Link> : `Journée ${match.matchday.number}`}
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
