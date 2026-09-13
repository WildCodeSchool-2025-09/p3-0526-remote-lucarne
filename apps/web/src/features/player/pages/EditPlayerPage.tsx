import type { Player } from "@lucarne/shared";
import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { Alert } from "../../../ui";
import { usePlayerDetail } from "../../../hooks/usePlayer";
import { UpdatePlayerForm } from "../components/UpdatePlayerForm";
export default function EditPlayerPage() { const { playerId = "" } = useParams(); const query = usePlayerDetail(playerId); const navigate = useNavigate(); const [saved, setSaved] = useState<Player | null>(null); if (query.isPending) return <p role="status">Chargement du joueur…</p>; if (query.isError || !query.data) return <Alert>Joueur introuvable.</Alert>; return <section className="create-league-page"><div className="create-league-page__container"><Link to={`/dashboard/players/${playerId}`}>← Retour à la fiche</Link>{saved ? <Alert variant="success">Le joueur a été modifié avec succès.</Alert> : null}<h1>Modifier {saved?.firstName ?? query.data.firstName} {saved?.lastName ?? query.data.lastName}</h1><UpdatePlayerForm player={saved ?? query.data} onCancel={() => void navigate(-1)} onSuccess={setSaved} /></div></section>; }
