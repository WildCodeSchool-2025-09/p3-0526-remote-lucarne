import type { Team } from "@lucarne/shared";
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
  const [saved, setSaved] = useState<Team | null>(null);
  if (query.isPending) return <p role="status">Chargement de l’équipe…</p>;
  if (query.isError || !query.data) return <AlertModal onClose={() => void navigate(-1)}>Équipe introuvable.</AlertModal>;
  return <section className="create-league-page"><div className="create-league-page__container"><Link to="/dashboard/teams">← Retour à la liste</Link>{saved ? <AlertModal variant="success">L’équipe a été modifiée avec succès.</AlertModal> : null}<h1>Modifier {saved?.name ?? query.data.name}</h1><UpdateTeamForm team={saved ?? query.data} canEditStatus={getCurrentAppRole() === APP_ROLES.ADMIN} onCancel={() => void navigate(-1)} onSuccess={setSaved} /></div></section>;
}
