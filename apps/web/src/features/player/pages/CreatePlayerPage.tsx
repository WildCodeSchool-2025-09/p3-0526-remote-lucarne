import { playerStyles } from "../playerStyles";
import type { PlayerDetail } from "@lucarne/shared";
import { useNavigate } from "react-router";
import DashboardPageHeader from "../../../components/dashboard/DashboardPageHeader";
import { Button } from "../../../ui";
import { CreatePlayerForm } from "../components/CreatePlayerForm";

export default function CreatePlayerPage() {
  const navigate = useNavigate();
  const handleSuccess = (player: PlayerDetail) => {
    void navigate(`/dashboard/players/${player.id}`, {
      state: { successMessage: "La joueuse a été créée avec succès." },
    });
  };

  return (
    <section className={playerStyles.formPage} aria-labelledby="create-player-title">
      <div className={playerStyles.container}>
        <Button
          className="min-h-9! justify-self-start px-3!"
          variant="ghost"
          onClick={() => void navigate("/dashboard/players")}
        >
          ← Retour à la liste
        </Button>
        <DashboardPageHeader
          resource="players"
          mode="create"
          headingId="create-player-title"
          title="Créer une joueuse"
          description="Renseignez les informations de la joueuse et son affectation éventuelle."
        />
        <CreatePlayerForm onSuccess={handleSuccess} />
      </div>
    </section>
  );
}
