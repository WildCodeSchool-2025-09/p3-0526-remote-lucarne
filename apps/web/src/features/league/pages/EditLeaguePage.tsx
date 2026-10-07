import { leagueStyles } from "../leagueStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole } from "../../../auth/authRole";
import { HttpError } from "../../../lib/httpClient";
import { AlertModal, Button } from "../../../ui";
import { UpdateLeagueForm } from "../components/UpdateLeagueForm";
import { useLeagueDetail } from "../hooks/useLeagueDetail";

export default function EditLeaguePage() {
  const navigate = useNavigate();
  const { leagueId = "" } = useParams();
  const query = useLeagueDetail(leagueId);
  const canEditStatus = getCurrentAppRole() === APP_ROLES.ADMIN;
  const [hasSaved, setHasSaved] = useState(false);

  const pageName = query.data?.name ?? "Ligue";
  const pageHeader = (
    <DashboardPageHeader
      resource="leagues"
      mode="edit"
      resourceId={leagueId}
      resourceName={pageName}
      headingId="edit-league-title"
      title={`Modifier ${pageName}`}
    />
  );

  if (query.isPending)
    return (
      <section className={leagueStyles.detailPage}>
        <div className={leagueStyles.detailContainer}>
          {pageHeader}
          <Link to="/dashboard/leagues">Retour à la liste</Link>
          <p role="status">Chargement de la ligue…</p>
        </div>
      </section>
    );

  if (query.isError) {
    const isNotFound =
      query.error instanceof HttpError &&
      (query.error.code === "RESOURCE_NOT_FOUND" || query.error.status === 404);

    return (
      <section className={leagueStyles.detailPage} aria-labelledby="edit-league-title">
        <div className={leagueStyles.detailContainer}>
          {pageHeader}
          <AlertModal onClose={() => void navigate("/dashboard/leagues")}>
            {isNotFound
              ? "Cette ligue n’existe plus ou a été supprimée."
              : "Impossible de charger cette ligue."}
          </AlertModal>
          <Button onClick={() => void navigate("/dashboard/leagues")} variant="outline">
            Retour à la liste
          </Button>
        </div>
      </section>
    );
  }

  if (!query.data)
    return (
      <section className={leagueStyles.detailPage}>
        <div className={leagueStyles.detailContainer}>
          {pageHeader}
          <AlertModal>Ressource introuvable.</AlertModal>
          <Link to="/dashboard/leagues">Retour à la liste</Link>
        </div>
      </section>
    );
  // The query cache is the only League data source. The local state below is
  // only a presentation flag and can therefore never mask a server reload.

  return (
    <section className={leagueStyles.formPage} aria-labelledby="edit-league-title">
      <div className={leagueStyles.container}>
        {pageHeader}
        <Link className={leagueStyles.backLink} to={`/dashboard/leagues/${leagueId}`}>
          ← Retour au détail
        </Link>
        {hasSaved ? (
          <AlertModal variant="success">La ligue a été modifiée avec succès.</AlertModal>
        ) : null}
        <UpdateLeagueForm
          canEditStatus={canEditStatus}
          league={query.data}
          onCancel={() => void navigate(`/dashboard/leagues/${leagueId}`)}
          onReload={() => {
            void query.refetch();
          }}
          onSuccess={() => setHasSaved(true)}
        />
      </div>
    </section>
  );
}
