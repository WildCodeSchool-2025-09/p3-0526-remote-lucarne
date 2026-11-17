import { playerStyles } from "../playerStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { Alert, Button } from "../../../ui";
import { PlayerAssignments } from "../components/PlayerAssignments";
import { CreatePlayerAssignmentForm } from "../components/CreatePlayerAssignmentForm";
import { usePlayerDetail } from "../../../hooks/usePlayer";
import { UpdatePlayerForm } from "../components/UpdatePlayerForm";

export default function EditPlayerPage() {
  const { playerId = "" } = useParams();
  const query = usePlayerDetail(playerId);
  const navigate = useNavigate();
  const [hasSaved, setHasSaved] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const pageName =
    (query.data ? `${query.data.firstName} ${query.data.lastName}` : undefined) ??
    "Joueuse";
  const pageHeader = (
    <DashboardPageHeader
      resource="players"
      mode="edit"
      resourceId={playerId}
      resourceName={pageName}
      headingId="edit-player-title"
      title={`Modifier ${pageName}`}
    />
  );

  if (query.isPending || query.isError || !query.data) {
    return (
      <section className={playerStyles.formPage}>
        <div className={playerStyles.container}>
          {pageHeader}
          {query.isPending ? (
            <p role="status">Chargement de la joueuse…</p>
          ) : (
            <Alert>Joueuse introuvable.</Alert>
          )}
          <Link to="/dashboard/players">Retour à la liste</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={playerStyles.formPage} aria-labelledby="edit-player-title">
      <div className={playerStyles.container}>
        {pageHeader}
        <Link to={`/dashboard/players/${playerId}`}>← Retour à la fiche</Link>
        {hasSaved ? (
          <Alert variant="success">La joueuse a été modifiée avec succès.</Alert>
        ) : null}
        <UpdatePlayerForm
          key={playerId}
          player={query.data}
          onCancel={() => void navigate(`/dashboard/players/${playerId}`)}
          onReload={() => {
            void query.refetch();
          }}
          onSuccess={() => setHasSaved(true)}
        />
        <PlayerAssignments
          assignments={query.data.assignments}
          playerId={playerId}
          canEdit
        >
          {!isScheduling ? (
            <Button onClick={() => setIsScheduling(true)} variant="outline">
              Ajouter une affectation
            </Button>
          ) : (
            <CreatePlayerAssignmentForm
              playerId={playerId}
              onCancel={() => setIsScheduling(false)}
              onSuccess={() => setIsScheduling(false)}
            />
          )}
        </PlayerAssignments>
      </div>
    </section>
  );
}
