import { seasonStyles } from "../seasonStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertModal, Button, ConfirmDialog } from "../../../ui";
import {
  APP_ROLES,
  getCurrentAppRole,
  hasRole,
  SEASON_MANAGE_ROLES,
  SEASON_UPDATE_ROLES,
} from "../../../auth/authRole";
import { HttpError } from "../../../lib/httpClient";
import { useSeasonDetail } from "../hooks/useSeasonDetail";
import { UpdateSeasonForm } from "../components/UpdateSeasonForm";
import SeasonLeagues from "../components/SeasonLeagues";
import SeasonParticipations from "../components/SeasonParticipations";
import { useDeleteSeason } from "../hooks/useDeleteSeason";

function EditSeasonPage() {
  const navigate = useNavigate();
  const { seasonId = "" } = useParams();
  const query = useSeasonDetail(seasonId);
  const [saved, setSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const deleteMutation = useDeleteSeason();
  const role = getCurrentAppRole();
  const canManage = hasRole(role, SEASON_MANAGE_ROLES);
  const canUpdate = hasRole(role, SEASON_UPDATE_ROLES);
  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(seasonId);

      void navigate("/dashboard/seasons");
    } catch {
      /* keep confirmation open with the server error */
    }
  };

  const navigation = (
    <>
      <Link
        className={seasonStyles.backLink}
        to={query.isError ? "/dashboard/seasons" : `/dashboard/seasons/${seasonId}`}
      >
        {query.isError ? "← Retour à la liste" : "← Retour au détail"}
      </Link>
    </>
  );

  const pageName = query.data?.name ?? "Saison";
  const pageHeader = (
    <DashboardPageHeader
      resource="seasons"
      mode="edit"
      resourceId={seasonId}
      resourceName={pageName}
      headingId="edit-season-title"
      title={`Modifier ${pageName}`}
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

  if (!query.data)
    return (
      <section className={seasonStyles.detailPage}>
        <div className={seasonStyles.detailContainer}>
          {pageHeader}
          <AlertModal>Ressource introuvable.</AlertModal>
          <Link to="/dashboard/seasons">Retour à la liste</Link>
        </div>
      </section>
    );

  const season = query.data;

  return (
    <section className={seasonStyles.formPage} aria-labelledby="edit-season-title">
      <div className={seasonStyles.container}>
        {pageHeader}
        {navigation}
        {saved ? (
          <AlertModal variant="success">La saison a été modifiée avec succès.</AlertModal>
        ) : null}

        {canUpdate ? (
          <UpdateSeasonForm
            onCancel={() => void navigate(`/dashboard/seasons/${seasonId}`)}
            onReload={() => void query.refetch()}
            onSuccess={() => setSaved(true)}
            season={season}
          />
        ) : null}
        {canManage ? (
          <>
            <SeasonLeagues season={season} />
            <section aria-labelledby="season-teams-title">
              <h2 id="season-teams-title">Équipes par ligue associée</h2>
              {season.leagueSeasons.length === 0 ? (
                <p>Associez une ligue pour gérer ses équipes participantes.</p>
              ) : (
                season.leagueSeasons.map((edition) => (
                  <section
                    key={edition.id}
                    aria-labelledby={`season-teams-${edition.id}`}
                  >
                    <h3 id={`season-teams-${edition.id}`}>{edition.league.name}</h3>
                    <SeasonParticipations season={edition} seasonName={season.name} />
                  </section>
                ))
              )}
            </section>
          </>
        ) : null}
        {role === APP_ROLES.ADMIN ? (
          <section
            className={seasonStyles.detailCard}
            aria-labelledby="season-delete-title"
          >
            <h2 id="season-delete-title">Suppression définitive</h2>
            <p>
              La saison ne peut être supprimée que si elle n’est associée à aucune ligue.
            </p>
            <Button
              disabled={deleteMutation.isPending || season.leagueSeasons.length > 0}
              onClick={() => {
                deleteMutation.reset();

                setPendingDelete(true);
              }}
              variant="danger"
            >
              Supprimer définitivement la saison
            </Button>
            <ConfirmDialog
              actionLabel="Supprimer la saison"
              error={deleteMutation.isError ? deleteMutation.error.message : undefined}
              onCancel={() => setPendingDelete(false)}
              onConfirm={() => void confirmDelete()}
              open={pendingDelete}
              pending={deleteMutation.isPending}
              title="Supprimer cette saison ?"
              variant="danger"
            >
              La saison « {season.name} » sera supprimée définitivement. Cette action est
              irréversible et impossible tant qu’elle est associée à une ligue.
            </ConfirmDialog>
          </section>
        ) : null}
      </div>
    </section>
  );
}

export default EditSeasonPage;
