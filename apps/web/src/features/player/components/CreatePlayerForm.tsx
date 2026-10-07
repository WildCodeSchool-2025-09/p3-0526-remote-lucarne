import { playerStyles } from "../playerStyles";
import type { PlayerDetail } from "@lucarne/shared";
import { createPlayerInputSchema } from "@lucarne/shared";
import { useState } from "react";
import { useCreatePlayer } from "../../../hooks/usePlayer";
import { useTeamList } from "../../../hooks/useTeamList";
import { HttpError } from "../../../lib/httpClient";
import { uploadPhoto } from "../../../services/uploadPhoto.service";
import { Alert, Button, FormField, ImagePicker, Input } from "../../../ui";

type CreatePlayerFormValues = {
  firstName: string;
  lastName: string;
  nationality: string;
  position: string;
  birthday: string;
  pictureUrl: string;
  teamId: string;
  leftAt: string;
  joinedAt: string;
  shirtNumber: string;
};

const initialValues: CreatePlayerFormValues = {
  firstName: "",
  lastName: "",
  nationality: "",
  position: "",
  birthday: "",
  pictureUrl: "",
  teamId: "",
  leftAt: "",
  joinedAt: "",
  shirtNumber: "",
};

function CreatePlayerForm({ onSuccess }: { onSuccess: (player: PlayerDetail) => void }) {
  const mutation = useCreatePlayer();
  const [teamPage, setTeamPage] = useState(1);
  const teams = useTeamList({
    page: teamPage,
    pageSize: 20,
    status: "ALL",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = isSubmitting || mutation.isPending;
  const setFieldValue = (field: keyof CreatePlayerFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) return;

    setError(null);

    if (!values.firstName.trim() || !values.lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires.");

      return;
    }
    if (values.leftAt && !values.teamId) {
      setError("Une date de fin requiert une équipe et une date de début.");

      return;
    }
    if (values.teamId && !values.joinedAt) {
      setError("La date d’arrivée est obligatoire lorsqu’une équipe est renseignée.");

      return;
    }

    const result = createPlayerInputSchema.safeParse({
      firstName: values.firstName,
      lastName: values.lastName,
      nationality: values.nationality || null,
      position: values.position || null,
      birthday: values.birthday || null,
      pictureUrl: photo ? null : values.pictureUrl || null,
      ...(values.teamId
        ? {
          teamId: values.teamId,
          joinedAt: values.joinedAt,
          leftAt: values.leftAt || null,
          shirtNumber: values.shirtNumber ? Number(values.shirtNumber) : null,
        }
        : {}),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Vérifiez les informations.");

      return;
    }

    setIsSubmitting(true);

    try {
      let pictureUrl = result.data.pictureUrl;

      if (photo) {
        pictureUrl = uploadedPhotoUrl ?? (await uploadPhoto(photo));
        setUploadedPhotoUrl(pictureUrl);
      }

      const player = await mutation.mutateAsync({ ...result.data, pictureUrl });

      onSuccess(player);
    } catch (failure) {
      setError(
        failure instanceof HttpError && failure.status === 413
          ? "La photo ne doit pas dépasser 5 Mo."
          : failure instanceof HttpError && failure.status < 500
            ? failure.message
            : "Impossible de créer la joueuse. Réessayez ; vos informations et votre photo sont conservées.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const totalPages = teams.data?.pagination.totalPages ?? 1;

  return (
    <form
      className={playerStyles.formLayout}
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      <fieldset
        className={`${playerStyles.formCard} m-0 min-w-0`}
        disabled={pending}
        aria-labelledby="player-information-title"
      >
        <header className={playerStyles.formFields}>
          <h2 id="player-information-title" className={playerStyles.formTitle}>
            Informations de la joueuse
          </h2>
          <p className={playerStyles.description}>
            Les champs marqués d’un astérisque sont obligatoires.
          </p>
        </header>
        <div className={playerStyles.formFields}>
          <FormField htmlFor="player-first-name" label="Prénom" required>
            <Input
              id="player-first-name"
              value={values.firstName}
              onChange={(e) => setFieldValue("firstName", e.target.value)}
            />
          </FormField>
          <FormField htmlFor="player-last-name" label="Nom" required>
            <Input
              id="player-last-name"
              value={values.lastName}
              onChange={(e) => setFieldValue("lastName", e.target.value)}
            />
          </FormField>
          <FormField htmlFor="player-nationality" label="Nationalité">
            <Input
              id="player-nationality"
              value={values.nationality}
              onChange={(e) => setFieldValue("nationality", e.target.value)}
            />
          </FormField>
          <FormField htmlFor="player-position" label="Poste">
            <Input
              id="player-position"
              value={values.position}
              onChange={(e) => setFieldValue("position", e.target.value)}
            />
          </FormField>
          <FormField htmlFor="player-birthday" label="Date de naissance">
            <Input
              id="player-birthday"
              type="date"
              value={values.birthday}
              onChange={(e) => setFieldValue("birthday", e.target.value)}
            />
          </FormField>
          <ImagePicker
            id="create-player-photo"
            label="Photo de la joueuse"
            inputLabel="Fichier photo"
            removeLabel="Retirer la photo"
            previewAlt="Aperçu de la photo sélectionnée"
            file={photo}
            disabled={pending}
            onChange={(file) => {
              setPhoto(file);
              setUploadedPhotoUrl(null);
            }}
          />
        </div>
      </fieldset>
      <fieldset
        className={`${playerStyles.formCard} m-0 min-w-0`}
        disabled={pending}
        aria-labelledby="player-assignment-title"
      >
        <header className={playerStyles.formFields}>
          <h2 id="player-assignment-title" className={playerStyles.formTitle}>
            Affectations
          </h2>
          <p className={playerStyles.description}>
            Vous pouvez créer la joueuse sans affectation.
          </p>
        </header>
        <div className={playerStyles.formFields}>
          <FormField htmlFor="player-team-id" label="Équipe">
            <select
              className={playerStyles.select}
              disabled={teams.isPending}
              id="player-team-id"
              value={values.teamId}
              onChange={(e) => setFieldValue("teamId", e.target.value)}
            >
              <option value="">Aucune équipe</option>
              {teams.data?.data.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            {teams.isPending ? <p role="status">Chargement des équipes…</p> : null}
            {teams.isError ? (
              <>
                <Alert variant="danger">Impossible de charger les équipes.</Alert>
                <Button type="button" onClick={() => void teams.refetch()}>
                  Réessayer
                </Button>
              </>
            ) : null}
            {!teams.isPending && !teams.isError && teams.data?.data.length === 0 ? (
              <p>Aucune équipe disponible.</p>
            ) : null}
            {totalPages > 1 ? (
              <div>
                <Button
                  disabled={teamPage === 1}
                  type="button"
                  variant="outline"
                  onClick={() => setTeamPage((page) => page - 1)}
                >
                  Équipes précédentes
                </Button>
                <span>
                  {" "}
                  Page {teamPage} sur {totalPages}{" "}
                </span>
                <Button
                  disabled={teamPage === totalPages}
                  type="button"
                  variant="outline"
                  onClick={() => setTeamPage((page) => page + 1)}
                >
                  Équipes suivantes
                </Button>
              </div>
            ) : null}
          </FormField>
          <FormField htmlFor="player-joined-at" label="Date de début">
            <Input
              id="player-joined-at"
              type="date"
              value={values.joinedAt}
              onChange={(e) => setFieldValue("joinedAt", e.target.value)}
            />
          </FormField>
          <FormField htmlFor="player-left-at" label="Date de fin (incluse)">
            <Input
              id="player-left-at"
              type="date"
              value={values.leftAt}
              onChange={(e) => setFieldValue("leftAt", e.target.value)}
            />
          </FormField>
          <FormField htmlFor="player-shirt-number" label="Numéro de maillot">
            <Input
              id="player-shirt-number"
              min="1"
              max="99"
              type="number"
              value={values.shirtNumber}
              onChange={(e) => setFieldValue("shirtNumber", e.target.value)}
            />
          </FormField>
        </div>
      </fieldset>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className={playerStyles.formActions}>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Création…" : "Créer la joueuse"}
        </Button>
      </div>
    </form>
  );
}

export { CreatePlayerForm };
