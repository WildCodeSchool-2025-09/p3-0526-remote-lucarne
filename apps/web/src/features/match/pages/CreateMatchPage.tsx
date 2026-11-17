import { matchStyles } from "../matchStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { createMatchInputSchema } from "@lucarne/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, FormField, LoadingState, Select } from "../../../ui";
import { createMatch } from "../../../services/match.service";
import { useSeasonDetail } from "../../season/hooks/useSeasonDetail";
import { useMatchMutation } from "../hooks/useMatches";
import { useMatchOptions } from "../hooks/useMatchOptions";

function CreateMatchPage() {
  const navigate = useNavigate();
  const options = useMatchOptions();
  const [seasonId, setSeasonId] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [matchdayId, setMatchdayId] = useState("");
  const [error, setError] = useState("");
  const season = useSeasonDetail(seasonId);
  const edition = season.data?.leagueSeasons.find((item) => item.leagueId === leagueId);
  const mutation = useMatchMutation(createMatch);

  return (
    <section className={matchStyles.formPage}>
      <div className={matchStyles.container}>
        <Link className="lucarne-button lucarne-button--ghost" to="/dashboard/matches">
          ← Retour à la liste des matchs
        </Link>
        <DashboardPageHeader
          resource="matches"
          mode="create"
          title="Ajouter un match"
          description="Les calendriers sont générés lors de l’association ligue/saison. Ajoutez ici un emplacement supplémentaire à une journée existante."
        />
        {options.isPending ? <LoadingState>Chargement des saisons…</LoadingState> : null}
        {options.isError ? (
          <Alert>
            Impossible de charger les référentiels.{" "}
            <Button onClick={() => void options.reload()}>Réessayer</Button>
          </Alert>
        ) : null}
        <form
          className={matchStyles.formCard}
          onSubmit={(event) => {
            event.preventDefault();
            mutation.reset();

            const parsed = createMatchInputSchema.safeParse({ matchdayId });

            if (
              !parsed.success ||
              !edition?.matchdays.some((day) => day.id === matchdayId)
            ) {
              setError("Choisissez une journée du calendrier sélectionné.");

              return;
            }

            setError("");
            mutation.mutate(parsed.data, {
              onSuccess: (match) => void navigate(`/dashboard/matches/${match.id}/edit`),
            });
          }}
        >
          <fieldset className={matchStyles.fieldset} disabled={mutation.isPending}>
            <legend>Calendrier du match</legend>
            <FormField htmlFor="create-match-season" label="Saison" required>
              <Select
                id="create-match-season"
                onChange={(event) => {
                  setSeasonId(event.target.value);
                  setLeagueId("");
                  setMatchdayId("");
                }}
                required
                value={seasonId}
              >
                <option value="">Choisir une saison</option>
                {options.seasons.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField htmlFor="create-match-league" label="Ligue" required>
              <Select
                disabled={!season.data}
                id="create-match-league"
                onChange={(event) => {
                  setLeagueId(event.target.value);
                  setMatchdayId("");
                }}
                required
                value={leagueId}
              >
                <option value="">Choisir une ligue associée</option>
                {season.data?.leagueSeasons.map((item) => (
                  <option key={item.id} value={item.leagueId}>
                    {item.league.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField htmlFor="create-match-day" label="Journée" required>
              <Select
                disabled={!edition}
                id="create-match-day"
                onChange={(event) => setMatchdayId(event.target.value)}
                required
                value={matchdayId}
              >
                <option value="">Choisir une journée</option>
                {edition?.matchdays.map((day) => (
                  <option key={day.id} value={day.id}>
                    Journée {day.number}
                  </option>
                ))}
              </Select>
            </FormField>
          </fieldset>
          {seasonId && season.isPending ? (
            <LoadingState>Chargement du calendrier…</LoadingState>
          ) : null}
          {seasonId && season.isError ? (
            <Alert>
              Impossible de charger le calendrier.{" "}
              <Button onClick={() => void season.refetch()}>
                Réessayer le calendrier
              </Button>
            </Alert>
          ) : null}
          {edition && edition.matchdays.length === 0 ? (
            <Alert>Ce calendrier ne contient aucune journée.</Alert>
          ) : null}
          {error ? <Alert>{error}</Alert> : null}
          {mutation.isError ? <Alert>{mutation.error.message}</Alert> : null}
          <div className={matchStyles.formActions}>
            <Link
              className="lucarne-button lucarne-button--ghost"
              to="/dashboard/matches"
            >
              Annuler
            </Link>
            <Button
              disabled={mutation.isPending || !matchdayId || options.isError}
              type="submit"
            >
              {mutation.isPending ? "Création…" : "Créer l’emplacement"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default CreateMatchPage;
