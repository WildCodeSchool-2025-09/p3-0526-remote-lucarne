import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useStaffMemberDetail } from "../../../hooks/useStaff";
import { Alert } from "../../../ui";
import { UpdateStaffMemberForm } from "../components/UpdateStaffMemberForm";

export default function EditStaffMemberPage() { const { staffMemberId = "" } = useParams(); const query = useStaffMemberDetail(staffMemberId); const navigate = useNavigate(); const [hasSaved, setHasSaved] = useState(false); if (query.isPending) return <p role="status">Chargement du membre du staff…</p>; if (query.isError || !query.data) return <Alert>Membre du staff introuvable.</Alert>; return <section className="create-league-page"><div className="create-league-page__container"><Link to={`/dashboard/staff-members/${staffMemberId}`}>← Retour à la fiche</Link>{hasSaved ? <Alert variant="success">Le membre du staff a été modifié avec succès.</Alert> : null}<h1>Modifier {query.data.firstName} {query.data.lastName}</h1><UpdateStaffMemberForm staffMember={query.data} onCancel={() => void navigate(-1)} onReload={() => { void query.refetch(); }} onSuccess={() => setHasSaved(true)} /></div></section>; }
