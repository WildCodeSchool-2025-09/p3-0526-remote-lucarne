import { matchStyles } from "../matchStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Alert, Button, LoadingState } from "../../../ui";
import { useSeasonDetail } from "../../season/hooks/useSeasonDetail";
import { useMatch } from "../hooks/useMatches";
import MatchProgrammingForm from "../components/MatchProgrammingForm";

function EditMatchPage() {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const query = useMatch(matchId);
  const season = useSeasonDetail(query.data?.seasonId ?? "");
  const [revision, setRevision] = useState(0);
  const edition = season.data?.leagueSeasons.find(
    (item) => item.id === query.data?.leagueSeasonId,
  );

  const pageName = "Match";
  const pageHeader = (
    <DashboardPageHeader
      resource="matches"
      mode="edit"
      resourceId={matchId}
      resourceName={pageName}
      headingId="edit-match-title"
      title="Modifier le match"
    />
  );

  return (
    <section className={matchStyles.formPage}>
      <div className={matchStyles.container}>
        {pageHeader}
        <Link
          className="lucarne-button lucarne-button--ghost"
          to={`/dashboard/matches/${matchId}`}
        >
          ← Retour au détail du match
        </Link>
        {query.isPending || (query.data && season.isPending) ? (
          <LoadingState>Chargement du match…</LoadingState>
        ) : null}
        {query.isError ? (
          <Alert>
            {query.error.message}
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
            <Link to="/dashboard/matches">Retour à la liste des matchs</Link>
          </Alert>
        ) : null}
        {query.data && season.isError ? (
          <Alert>
            Impossible de charger le calendrier.
            <Button onClick={() => void season.refetch()}>Réessayer le calendrier</Button>
          </Alert>
        ) : null}
        {query.data && edition ? (
          <>
            <p>
              {season.data?.name} · {edition.league.name}
            </p>
            <MatchProgrammingForm
              edition={edition}
              key={revision}
              match={query.data}
              onReload={() => {
                void query.refetch().then((result) => {
                  if (result.isSuccess) setRevision((value) => value + 1);
                });
              }}
              onSaved={() => void navigate(`/dashboard/matches/${matchId}`)}
            />
          </>
        ) : null}
        {query.data && season.isSuccess && !edition ? (
          <Alert>Le calendrier de ce match est indisponible.</Alert>
        ) : null}
      </div>
    </section>
  );
}

export default EditMatchPage;
