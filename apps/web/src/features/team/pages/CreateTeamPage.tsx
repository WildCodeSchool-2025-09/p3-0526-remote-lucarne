import { teamStyles } from "../teamStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import type { Team } from "@lucarne/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button } from "../../../ui";
import { CreateTeamForm } from "../components/CreateTeamForm";

function CreateTeamPage() {
  const navigate = useNavigate();
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);

  return (
    <section className={teamStyles.formPage} aria-labelledby="create-team-page-title">
      <div className={teamStyles.container}>
        <Button
          className="min-h-9! justify-self-start px-3!"
          onClick={() => {
            void navigate("/dashboard/teams");
          }}
          variant="ghost"
        >
          ← Retour à la liste
        </Button>

        <DashboardPageHeader
          resource="teams"
          mode="create"
          headingId="create-team-page-title"
          title="Créer une équipe"
          description="Ajoutez les informations principales de l’équipe."
        />

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
