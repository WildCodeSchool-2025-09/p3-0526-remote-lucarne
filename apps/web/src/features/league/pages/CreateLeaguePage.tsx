import type { League } from "@lucarne/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button } from "../../../ui";
import { CreateLeagueForm } from "../components/CreateLeagueForm";

function CreateLeaguePage() {
  const navigate = useNavigate();
  const [createdLeague, setCreatedLeague] = useState<League | null>(null);

  return (
    <section className="create-league-page" aria-labelledby="create-league-page-title">
      <div className="create-league-page__container">
        <Button
          className="create-league-page__back"
          onClick={() => {
            void navigate(-1);
          }}
          variant="ghost"
        >
          ← Retour
        </Button>

        <header className="create-league-page__header">
          <h1 id="create-league-page-title">Créer une ligue</h1>
          <p>Ajoutez les informations principales de la ligue.</p>
        </header>

        {createdLeague ? (
          <Alert variant="success">
            La ligue a été créée avec succès.
          </Alert>
        ) : null}

        <CreateLeagueForm onSuccess={setCreatedLeague} />
      </div>
    </section>
  );
}

export default CreateLeaguePage;
