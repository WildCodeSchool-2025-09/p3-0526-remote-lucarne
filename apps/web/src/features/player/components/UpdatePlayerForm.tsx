import { playerStyles } from "../playerStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Player, UpdatePlayerInput } from "@lucarne/shared";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useUpdatePlayer } from "../../../hooks/usePlayer";
import { HttpError } from "../../../lib/httpClient";
import { uploadPhoto } from "../../../services/uploadPhoto.service";
import { PlayerPhoto } from "./PlayerPhoto";
import { Alert, Button, FormField, ImagePicker, Input } from "../../../ui";

const playerFormSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  nationality: z.string(),
  position: z.string(),
  birthday: z
    .string()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Date invalide",
    ),
  pictureUrl: z
    .string()
    .refine((value) => value === "" || /^https?:\/\//.test(value), "URL invalide"),
  version: z.number(),
});

type PlayerFormValues = z.infer<typeof playerFormSchema>;

const valuesOf = (player: Player): PlayerFormValues => ({
  firstName: player.firstName,
  lastName: player.lastName,
  nationality: player.nationality ?? "",
  position: player.position ?? "",
  birthday: player.birthday ?? "",
  pictureUrl: player.pictureUrl ?? "",
  version: player.version,
});

function UpdatePlayerForm({
  player,
  onCancel,
  onReload,
  onSuccess,
}: {
  player: Player;
  onCancel: () => void;
  onReload: () => void;
  onSuccess: (player: Player) => void;
}) {
  const mutation = useUpdatePlayer();
  const previousPlayer = useRef(player);
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = isSubmitting || mutation.isPending;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: valuesOf(player),
  });
  const pictureUrl = useWatch({ control, name: "pictureUrl" });

  useEffect(() => {
    const previous = valuesOf(previousPlayer.current);
    const next = valuesOf(player);
    const informationChanged = (
      [
        "firstName",
        "lastName",
        "nationality",
        "position",
        "birthday",
        "pictureUrl",
      ] as const
    ).some((field) => previous[field] !== next[field]);

    if (previousPlayer.current.id !== player.id || informationChanged) reset(next);
    else setValue("version", player.version);

    previousPlayer.current = player;
  }, [player, reset, setValue]);

  const submit = async (values: PlayerFormValues) => {
    if (pending) return;

    setUploadError(null);
    setIsSubmitting(true);

    const input: UpdatePlayerInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      nationality: values.nationality || null,
      position: values.position || null,
      birthday: values.birthday || null,
      pictureUrl: values.pictureUrl || null,
      version: values.version,
    };

    try {
      if (photo) {
        input.pictureUrl = uploadedPhotoUrl ?? (await uploadPhoto(photo));
        setUploadedPhotoUrl(input.pictureUrl);
      }

      mutation.mutate(
        { id: player.id, input },
        {
          onSuccess: (updated) => {
            reset(valuesOf(updated));
            setPhoto(null);
            setUploadedPhotoUrl(null);
            setIsSubmitting(false);
            onSuccess(updated);
          },
          onError: () => setIsSubmitting(false),
        },
      );
    } catch (failure) {
      setIsSubmitting(false);
      setUploadError(
        failure instanceof HttpError && failure.status === 413
          ? "La photo ne doit pas dépasser 5 Mo."
          : failure instanceof HttpError && failure.status < 500
            ? failure.message
            : "Impossible d’envoyer la photo. Réessayez ; vos informations sont conservées.",
      );
    }
  };
  const isVersionConflict =
    mutation.error instanceof Error &&
    "code" in mutation.error &&
    mutation.error.code === "RESOURCE_VERSION_CONFLICT";

  return (
    <form
      className={playerStyles.formLayout}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
    >
      <fieldset
        className={`${playerStyles.formCard} m-0 min-w-0`}
        disabled={pending}
        aria-labelledby="update-player-information-title"
      >
        <header className={playerStyles.formFields}>
          <h2 id="update-player-information-title" className={playerStyles.formTitle}>
            Informations de la joueuse
          </h2>
          <p className={playerStyles.description}>
            Les champs marqués d’un astérisque sont obligatoires.
          </p>
        </header>
        <div className={playerStyles.formFields}>
          <FormField
            error={errors.firstName?.message}
            htmlFor="update-player-first-name"
            label="Prénom"
            required
          >
            <Input
              id="update-player-first-name"
              hasError={errors.firstName != null}
              {...register("firstName")}
            />
          </FormField>
          <FormField
            error={errors.lastName?.message}
            htmlFor="update-player-last-name"
            label="Nom"
            required
          >
            <Input
              id="update-player-last-name"
              hasError={errors.lastName != null}
              {...register("lastName")}
            />
          </FormField>
          <FormField
            error={errors.nationality?.message}
            htmlFor="update-player-nationality"
            label="Nationalité"
          >
            <Input id="update-player-nationality" {...register("nationality")} />
          </FormField>
          <FormField
            error={errors.position?.message}
            htmlFor="update-player-position"
            label="Poste"
          >
            <Input id="update-player-position" {...register("position")} />
          </FormField>
          <FormField
            error={errors.birthday?.message}
            htmlFor="update-player-birthday"
            label="Date de naissance"
          >
            <Input id="update-player-birthday" type="date" {...register("birthday")} />
          </FormField>
          {!photo ? (
            <PlayerPhoto
              key={pictureUrl}
              pictureUrl={pictureUrl || null}
              name={`${player.firstName} ${player.lastName}`}
            />
          ) : null}
          <ImagePicker
            id="update-player-photo"
            label="Photo de la joueuse"
            inputLabel="Fichier photo"
            removeLabel="Retirer la photo"
            previewAlt="Aperçu de la photo sélectionnée"
            file={photo}
            disabled={pending}
            onChange={(file) => {
              setPhoto(file);
              setUploadedPhotoUrl(null);
              setUploadError(null);
            }}
          />
          {pictureUrl && !photo ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setValue("pictureUrl", "", { shouldDirty: true, shouldValidate: true })
              }
            >
              Supprimer la photo actuelle
            </Button>
          ) : null}
        </div>
      </fieldset>
      {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
      {isVersionConflict ? (
        <Alert variant="danger">
          La joueuse a été modifiée ailleurs.{" "}
          <Button
            onClick={() => {
              mutation.reset();
              onReload();
            }}
            type="button"
            variant="outline"
          >
            Recharger la fiche
          </Button>
        </Alert>
      ) : null}
      {mutation.isError && !isVersionConflict ? (
        <Alert variant="danger">
          Impossible de modifier la joueuse. Vos informations et votre photo sont
          conservées.
        </Alert>
      ) : null}
      <div className={playerStyles.formActions}>
        <Button disabled={pending} onClick={onCancel} type="button" variant="ghost">
          Annuler
        </Button>
        <Button disabled={(!isDirty && !photo) || pending} type="submit">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

export { UpdatePlayerForm };
