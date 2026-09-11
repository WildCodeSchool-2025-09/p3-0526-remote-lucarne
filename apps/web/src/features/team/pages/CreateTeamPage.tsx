import type { Team } from "@lucarne/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button } from "../../../ui";
import { CreateTeamForm } from "../components/CreateTeamForm";

function CreateTeamPage() {
  const navigate = useNavigate();
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);

  return (
    <section className="create-team-page" aria-labelledby="create-team-page-title">
      <div className="create-team-page__container">
        <Button
          className="create-team-page__back"
          onClick={() => {
            void navigate(-1);
          }}
          variant="ghost"
        >
          ← Retour
        </Button>

        <header className="create-team-page__header">
          <h1 id="create-team-page-title">Créer une équipe</h1>
          <p>Ajoutez les informations principales de l’équipe.</p>
        </header>

        {createdTeam ? (
          <Alert variant="success">
            L’équipe {createdTeam.name} a été créée avec succès.
          </Alert>
        ) : null}

        <CreateTeamForm onSuccess={setCreatedTeam} />
      </div>
    </section>
  );
}

export default CreateTeamPage;
