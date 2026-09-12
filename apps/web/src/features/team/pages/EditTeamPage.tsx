import type { Team } from "@lucarne/shared";
import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { Alert } from "../../../ui";
import { getCurrentAppRole, APP_ROLES } from "../../../auth/authRole";
import { useTeamDetail } from "../../../hooks/useTeamDetail";
import { UpdateTeamForm } from "../components/UpdateTeamForm";
export default function EditTeamPage() { const { teamId = "" } = useParams(); const query = useTeamDetail(teamId); const navigate = useNavigate(); const [saved, setSaved] = useState<Team | null>(null); if (query.isPending) return <p role="status">Chargement de l’équipe…</p>; if (query.isError || !query.data) return <Alert>Équipe introuvable.</Alert>; return <section className="create-league-page"><div className="create-league-page__container"><Link to="/dashboard/teams">← Retour à la liste</Link>{saved ? <Alert variant="success">L’équipe a été modifiée avec succès.</Alert> : null}<h1>Modifier {saved?.name ?? query.data.name}</h1><UpdateTeamForm team={saved ?? query.data} canEditStatus={getCurrentAppRole() === APP_ROLES.ADMIN} onCancel={() => void navigate(-1)} onSuccess={setSaved} /></div></section>; }
