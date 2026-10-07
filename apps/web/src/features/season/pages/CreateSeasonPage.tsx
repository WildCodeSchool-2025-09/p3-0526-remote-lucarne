import { seasonStyles } from "../seasonStyles";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import type { Season } from "@lucarne/shared";
import { useState } from "react";
import { Link } from "react-router";
import { Alert } from "../../../ui";
import { CreateSeasonForm } from "../components/CreateSeasonForm";

function CreateSeasonPage() {
  const [createdSeason, setCreatedSeason] = useState<Season | null>(null);

  return (
    <section className={seasonStyles.formPage} aria-labelledby="create-season-title">
      <div className={seasonStyles.container}>
        <Link className={seasonStyles.backLink} to="/dashboard/seasons">
          ← Retour à la liste
        </Link>
        <DashboardPageHeader
          resource="seasons"
          mode="create"
          headingId="create-season-title"
          title="Créer une saison"
          description="Créez une saison qui pourra être associée à plusieurs ligues."
        />
        {createdSeason ? (
          <Alert variant="success">La saison a été créée avec succès.</Alert>
        ) : null}
        <CreateSeasonForm onSuccess={setCreatedSeason} />
      </div>
    </section>
  );
}

export default CreateSeasonPage;
