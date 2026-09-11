import type { League } from "@lucarne/shared";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole } from "../../../auth/authRole";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button } from "../../../ui";
import { UpdateLeagueForm } from "../components/UpdateLeagueForm";
import { useLeagueDetail } from "../hooks/useLeagueDetail";

function EditLeaguePage() {
  const navigate = useNavigate();
  const { leagueId = "" } = useParams();
  const query = useLeagueDetail(leagueId);
  const role = getCurrentAppRole();
  const canEditStatus = role === APP_ROLES.ADMIN;
  const [savedLeague, setSavedLeague] = useState<League | null>(null);

  if (query.isPending) {
    return <section className="league-detail-page"><div className="league-detail-page__container"><p role="status">Chargement de la ligue…</p></div></section>;
  }

  if (query.isError) {
    const isNotFound = query.error instanceof HttpError
      && (query.error.code === "RESOURCE_NOT_FOUND" || query.error.status === 404);

    return (
      <section className="league-detail-page" aria-labelledby="edit-league-error-title">
        <div className="league-detail-page__container">
          <h1 id="edit-league-error-title">{isNotFound ? "Ligue introuvable" : "Impossible de charger la ligue"}</h1>
          <Alert>{isNotFound ? "Cette ligue n’existe plus ou a été supprimée." : "Impossible de charger cette ligue."}</Alert>
          <Button onClick={() => void navigate(-1)} variant="outline">Retour à la liste</Button>
        </div>
      </section>
    );
  }

  if (!query.data) return null;

  const league = savedLeague ?? query.data;

  return (
    <section className="create-league-page edit-league-page" aria-labelledby="edit-league-title">
      <div className="create-league-page__container">
        <Link className="lucarne-button lucarne-button--ghost create-league-page__back" to="/dashboard/leagues">
          ← Retour à la liste
        </Link>
        {savedLeague ? <Alert variant="success">La ligue a été modifiée avec succès.</Alert> : null}
        <h1 id="edit-league-title">Modifier {league.name}</h1>
        <UpdateLeagueForm
          canEditStatus={canEditStatus}
          league={league}
          onCancel={() => void navigate(-1)}
          onReload={() => {
            void query.refetch();
          }}
          onSuccess={setSavedLeague}
        />
      </div>
    </section>
  );
}

export default EditLeaguePage;
