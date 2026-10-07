import { leagueStyles } from "../leagueStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { League } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type {
  UpdateLeagueFormData,
  UpdateLeagueFormValues,
} from "../../../schemas/league.schema";
import {
  toUpdateLeagueInput,
  updateLeagueFormSchema,
} from "../../../schemas/league.schema";
import { useUpdateLeague } from "../../../hooks/useUpdateLeague";
import { HttpError } from "../../../lib/httpClient";
import { uploadPhoto } from "../../../services/uploadPhoto.service";
import { Alert, AlertModal, Button, Checkbox, EntityLogo, FormField, ImagePicker, Input } from "../../../ui";

interface UpdateLeagueFormProps {
  league: League;
  canEditStatus: boolean;
  onCancel: () => void;
  onReload: () => void;
  onSuccess: (league: League) => void;
}

const fieldNames = ["name", "country", "logoUrl", "isActive"] as const;

const valuesOf = (league: League): UpdateLeagueFormValues => ({
  name: league.name,
  country: league.country,
  logoUrl: league.logoUrl ?? "",
  isActive: league.isActive ?? league.status === "ACTIVE",
  version: league.version,
});

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== "" ? error.message : fallback;
}

function UpdateLeagueForm(props: UpdateLeagueFormProps) {
  return <LeagueForm key={props.league.id} {...props} />;
}

function LeagueForm({
  league,
  canEditStatus,
  onCancel,
  onReload,
  onSuccess,
}: UpdateLeagueFormProps) {
  const mutation = useUpdateLeague(league.id);
  const [logo, setLogo] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    formState: { dirtyFields, errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    control,
  } = useForm<UpdateLeagueFormValues, undefined, UpdateLeagueFormData>({
    defaultValues: valuesOf(league),
    resolver: zodResolver(updateLeagueFormSchema),
  });
  const logoUrl = useWatch({ control, name: "logoUrl" });
  const pending = isSubmitting || mutation.isPending;

  useEffect(() => {
    reset(valuesOf(league));
  }, [league, reset]);

  useEffect(() => {
    if (mutation.error == null) return;

    for (const detail of mutation.error.details ?? []) {
      if ((fieldNames as readonly string[]).includes(detail.field)) {
        setError(detail.field as keyof UpdateLeagueFormData, { message: detail.message });
      }
    }
  }, [mutation.error, setError]);

  const onSubmit = async (values: UpdateLeagueFormData) => {
    if (pending) return;

    let nextValues = values;
    const changedFields = { ...dirtyFields };

    try {
      if (logo) {
        const uploadedUrl = uploadedLogoUrl ?? (await uploadPhoto(logo));

        setUploadedLogoUrl(uploadedUrl);
        nextValues = { ...values, logoUrl: uploadedUrl };
        changedFields.logoUrl = true;
      }
    } catch (failure) {
      setUploadError(
        failure instanceof HttpError && failure.status === 413
          ? "Le logo ne doit pas dépasser 5 Mo."
          : failure instanceof HttpError && failure.status < 500
            ? failure.message
            : "Impossible d’envoyer le logo. Réessayez ; vos informations et votre fichier sont conservés.",
      );

      return;
    }

    const input = toUpdateLeagueInput(nextValues, changedFields, canEditStatus);

    mutation.mutate(input, {
      onSuccess: (updated) => {
        reset(valuesOf(updated));
        setLogo(null);
        setUploadedLogoUrl(null);
        setUploadError(null);
        onSuccess(updated);
      },
    });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (pending) {
      event.preventDefault();

      return;
    }

    mutation.reset();
    setUploadError(null);
    void handleSubmit(onSubmit)(event);
  };

  const isVersionConflict =
    mutation.error instanceof Error &&
    "code" in mutation.error &&
    mutation.error.code === "RESOURCE_VERSION_CONFLICT";

  return (
    <form className={leagueStyles.formCard} noValidate onSubmit={handleFormSubmit}>
      <header className="grid gap-2">
        <h2 className="m-0 text-[24px]">Modifier la ligue</h2>
        <p className="m-0 text-[var(--color-text-secondary)]">
          Mettez à jour les informations de la ligue.
        </p>
      </header>

      <div className={leagueStyles.formFields}>
        <FormField
          error={errors.name?.message}
          htmlFor="update-league-name"
          label="Nom"
          required
        >
          <Input
            id="update-league-name"
            disabled={pending}
            hasError={errors.name != null}
            {...register("name")}
          />
        </FormField>
        <FormField
          error={errors.country?.message}
          htmlFor="update-league-country"
          label="Pays"
          required
        >
          <Input
            id="update-league-country"
            disabled={pending}
            hasError={errors.country != null}
            {...register("country")}
          />
        </FormField>
        {logoUrl && !logo ? <EntityLogo logoUrl={logoUrl} name={league.name} /> : null}
        <ImagePicker
          id="update-league-logo"
          label="Logo de la ligue"
          inputLabel="Fichier logo"
          removeLabel="Retirer le logo"
          previewAlt="Aperçu du logo sélectionné"
          file={logo}
          disabled={pending}
          onChange={(file) => {
            setLogo(file);
            setUploadedLogoUrl(null);
            setUploadError(null);
          }}
        />
        {logoUrl && !logo ? (
          <Button
            disabled={pending}
            type="button"
            variant="ghost"
            onClick={() => setValue("logoUrl", "", { shouldDirty: true, shouldValidate: true })}
          >
            Supprimer le logo actuel
          </Button>
        ) : null}
        {errors.logoUrl?.message ? <Alert variant="danger">{errors.logoUrl.message}</Alert> : null}
        {canEditStatus ? (
          <label
            className="flex items-center gap-2 text-[14px] text-[var(--color-text-primary)]"
            htmlFor="update-league-is-active"
          >
            <Checkbox id="update-league-is-active" disabled={pending} {...register("isActive")} />
            Ligue active
          </label>
        ) : null}
      </div>

      {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
      {isVersionConflict ? (
        <AlertModal variant="danger">
          Cette ligue a été modifiée par un autre utilisateur. Rechargez les données avant
          de réessayer.
          <Button
            onClick={() => {
              mutation.reset();
              setLogo(null);
              setUploadedLogoUrl(null);
              setUploadError(null);
              onReload();
            }}
            type="button"
            variant="outline"
          >
            Recharger les données
          </Button>
        </AlertModal>
      ) : null}
      {mutation.isError && !isVersionConflict ? (
        <AlertModal variant="danger">
          {getErrorMessage(mutation.error, "La ligue n’a pas pu être modifiée.")}
        </AlertModal>
      ) : null}

      <div className={leagueStyles.formActions}>
        <Button
          disabled={pending}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          Annuler
        </Button>
        <Button disabled={pending || (!isDirty && !logo)} type="submit" variant="primary">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

export { UpdateLeagueForm };

export type { UpdateLeagueFormProps };
