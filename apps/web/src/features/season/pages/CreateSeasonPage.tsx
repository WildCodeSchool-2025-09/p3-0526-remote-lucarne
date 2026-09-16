import type { Season } from "@lucarne/shared";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useLeagueList } from "../../league/hooks/useLeagueList";
import { Alert, Button, FormField, LoadingState, Select } from "../../../ui";
import { CreateSeasonForm } from "../components/CreateSeasonForm";

function CreateSeasonPage() {
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get("leagueId") ?? "";
  const [selectedLeagueId, setSelectedLeagueId] = useState(leagueId);
  const leaguesQuery = useLeagueList({ page: 1, pageSize: 20, status: "ACTIVE", sortBy: "name", sortOrder: "asc" });
  const [createdSeason, setCreatedSeason] = useState<Season | null>(null);

  return <section className="create-league-page" aria-labelledby="create-season-title"><div className="create-league-page__container"><Link className="lucarne-button lucarne-button--ghost create-league-page__back" to="/dashboard/seasons">← Retour à la liste</Link><header className="create-league-page__header"><h1 id="create-season-title">Créer une saison</h1><p>Ajoutez la période sportive d’une ligue.</p></header>{createdSeason ? <Alert variant="success">La saison a été créée avec succès.</Alert> : null}{leaguesQuery.isPending ? <LoadingState>Chargement des ligues…</LoadingState> : null}<FormField htmlFor="season-league" label="Ligue" required><Select id="season-league" onChange={(event) => setSelectedLeagueId(event.target.value)} value={selectedLeagueId}><option value="">Sélectionner une ligue</option>{leaguesQuery.data?.data.map((league) => <option key={league.id} value={league.id}>{league.name} — {league.country}</option>)}</Select></FormField>{leaguesQuery.isError ? <Alert variant="danger">Impossible de charger les ligues actives.</Alert> : null}{selectedLeagueId ? <CreateSeasonForm leagueId={selectedLeagueId} onSuccess={setCreatedSeason} /> : <Alert>Choisissez une ligue active pour continuer.</Alert>}{!selectedLeagueId ? <Button onClick={() => void window.history.back()} variant="outline">Retour</Button> : null}</div></section>;
}

export default CreateSeasonPage;
