import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { Alert } from "../../../ui";
import { usePlayerDetail } from "../../../hooks/usePlayer";
import { UpdatePlayerForm } from "../components/UpdatePlayerForm";
export default function EditPlayerPage() { const { playerId = "" } = useParams(); const query = usePlayerDetail(playerId); const navigate = useNavigate(); const [hasSaved, setHasSaved] = useState(false); if (query.isPending) return <p role="status">Chargement du joueur…</p>; if (query.isError || !query.data) return <Alert>Joueur introuvable.</Alert>; return <section className="create-league-page"><div className="create-league-page__container"><Link to={`/dashboard/players/${playerId}`}>← Retour à la fiche</Link>{hasSaved ? <Alert variant="success">Le joueur a été modifié avec succès.</Alert> : null}<h1>Modifier {query.data.firstName} {query.data.lastName}</h1><UpdatePlayerForm player={query.data} onCancel={() => void navigate(-1)} onReload={() => { void query.refetch(); }} onSuccess={() => setHasSaved(true)} /></div></section>; }
