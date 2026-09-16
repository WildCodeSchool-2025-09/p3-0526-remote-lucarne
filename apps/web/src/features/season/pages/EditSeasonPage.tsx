import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertModal, Button } from "../../../ui";
import { HttpError } from "../../../lib/httpClient";
import { useSeasonDetail } from "../hooks/useSeasonDetail";
import { UpdateSeasonForm } from "../components/UpdateSeasonForm";

function EditSeasonPage() {
  const navigate = useNavigate();
  const { seasonId = "" } = useParams();
  const query = useSeasonDetail(seasonId);
  const [saved, setSaved] = useState(false);

  if (query.isPending) return <section className="league-detail-page"><div className="league-detail-page__container"><p role="status">Chargement de la saison…</p></div></section>;
  if (query.isError) return <section className="league-detail-page"><div className="league-detail-page__container"><AlertModal onClose={() => void navigate(-1)}>{query.error instanceof HttpError && query.error.status === 404 ? "Cette saison est introuvable." : "Impossible de charger cette saison."}</AlertModal><Button onClick={() => void navigate(-1)} variant="outline">Retour</Button></div></section>;
  if (!query.data) return null;

  return <section className="create-league-page edit-league-page" aria-labelledby="edit-season-title"><div className="create-league-page__container"><Link className="lucarne-button lucarne-button--ghost create-league-page__back" to={`/dashboard/seasons/${query.data.id}`}>← Retour à la saison</Link>{saved ? <AlertModal variant="success">La saison a été modifiée avec succès.</AlertModal> : null}<h1 id="edit-season-title">Modifier {query.data.name}</h1><UpdateSeasonForm onCancel={() => void navigate(-1)} onReload={() => void query.refetch()} onSuccess={() => setSaved(true)} season={query.data} /></div></section>;
}

export default EditSeasonPage;
