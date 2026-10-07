import { leagueStyles } from "../leagueStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import type { League } from "@lucarne/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button } from "../../../ui";
import { CreateLeagueForm } from "../components/CreateLeagueForm";

function CreateLeaguePage() {
  const navigate = useNavigate();
  const [createdLeague, setCreatedLeague] = useState<League | null>(null);

  return (
    <section className={leagueStyles.formPage} aria-labelledby="create-league-page-title">
      <div className={leagueStyles.container}>
        <Button
          className={leagueStyles.backButton}
          onClick={() => {
            void navigate("/dashboard/leagues");
          }}
          variant="ghost"
        >
          ← Retour à la liste
        </Button>

        <DashboardPageHeader
          resource="leagues"
          mode="create"
          headingId="create-league-page-title"
          title="Créer une ligue"
          description="Ajoutez les informations principales de la ligue."
        />

        {createdLeague ? (
          <Alert variant="success">La ligue a été créée avec succès.</Alert>
        ) : null}

        <CreateLeagueForm onSuccess={setCreatedLeague} />
      </div>
    </section>
  );
}

export default CreateLeaguePage;
