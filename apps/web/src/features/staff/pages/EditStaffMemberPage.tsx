import { staffStyles } from "../staffStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useStaffMemberDetail } from "../../../hooks/useStaff";
import { Alert } from "../../../ui";
import { UpdateStaffMemberForm } from "../components/UpdateStaffMemberForm";

export default function EditStaffMemberPage() {
  const { staffMemberId = "" } = useParams();
  const query = useStaffMemberDetail(staffMemberId);
  const navigate = useNavigate();
  const [hasSaved, setHasSaved] = useState(false);
  const pageName =
    (query.data ? `${query.data.firstName} ${query.data.lastName}` : undefined) ??
    "Membre du staff";
  const pageHeader = (
    <DashboardPageHeader
      resource="staff"
      mode="edit"
      resourceId={staffMemberId}
      resourceName={pageName}
      headingId="edit-staff-title"
      title={`Modifier ${pageName}`}
    />
  );
  if (query.isPending)
    return (
      <section className={staffStyles.formPage}>
        <div className={staffStyles.container}>
          {pageHeader}
          <p role="status">Chargement du membre du staff…</p>
          <Link to="/dashboard/staff-members">Retour à la liste</Link>
        </div>
      </section>
    );
  if (query.isError || !query.data)
    return (
      <section className={staffStyles.formPage}>
        <div className={staffStyles.container}>
          {pageHeader}
          <Alert>Membre du staff introuvable.</Alert>
          <Link to="/dashboard/staff-members">Retour à la liste</Link>
        </div>
      </section>
    );
  return (
    <section className={staffStyles.formPage}>
      <div className={staffStyles.container}>
        {pageHeader}
        <Link to={`/dashboard/staff-members/${staffMemberId}`}>← Retour à la fiche</Link>
        {hasSaved ? (
          <Alert variant="success">Le membre du staff a été modifié avec succès.</Alert>
        ) : null}
        <UpdateStaffMemberForm
          staffMember={query.data}
          onCancel={() => void navigate(`/dashboard/staff-members/${staffMemberId}`)}
          onReload={() => {
            void query.refetch();
          }}
          onSuccess={() => setHasSaved(true)}
        />
      </div>
    </section>
  );
}
