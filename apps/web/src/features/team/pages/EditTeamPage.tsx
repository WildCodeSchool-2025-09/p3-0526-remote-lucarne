import { teamStyles } from "../teamStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { APP_ROLES, getCurrentAppRole } from "../../../auth/authRole";
import { AlertModal } from "../../../ui";
import { useTeamDetail } from "../../../hooks/useTeamDetail";
import { UpdateTeamForm } from "../components/UpdateTeamForm";

export default function EditTeamPage() {
  const { teamId = "" } = useParams();
  const query = useTeamDetail(teamId);
  const navigate = useNavigate();
  const [hasSaved, setHasSaved] = useState(false);

  const pageName = query.data?.name ?? "Équipe";
  const pageHeader = (
    <DashboardPageHeader
      resource="teams"
      mode="edit"
      resourceId={teamId}
      resourceName={pageName}
      headingId="edit-team-title"
      title={`Modifier ${pageName}`}
    />
  );
  if (query.isPending)
    return (
      <section className={teamStyles.formPage}>
        <div className={teamStyles.container}>
          {pageHeader}
          <Link to="/dashboard/teams">Retour à la liste</Link>
          <p role="status">Chargement de l’équipe…</p>
        </div>
      </section>
    );
  if (query.isError || !query.data)
    return (
      <section className={teamStyles.formPage}>
        <div className={teamStyles.container}>
          {pageHeader}
          <Link to="/dashboard/teams">Retour à la liste</Link>
          <AlertModal onClose={() => void navigate("/dashboard/teams")}>
            Équipe introuvable.
          </AlertModal>
        </div>
      </section>
    );
  return (
    <section className={teamStyles.formPage}>
      <div className={teamStyles.container}>
        {pageHeader}
        <Link to={`/dashboard/teams/${teamId}`}>← Retour au détail</Link>
        {hasSaved ? (
          <AlertModal variant="success">L’équipe a été modifiée avec succès.</AlertModal>
        ) : null}
        <UpdateTeamForm
          team={query.data}
          canEditStatus={getCurrentAppRole() === APP_ROLES.ADMIN}
          onCancel={() => void navigate(`/dashboard/teams/${teamId}`)}
          onSuccess={() => setHasSaved(true)}
        />
      </div>
    </section>
  );
}
