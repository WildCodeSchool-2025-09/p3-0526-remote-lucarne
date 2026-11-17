import { leagueStyles } from "../leagueStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { League } from "@lucarne/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type {
  CreateLeagueFormData,
  CreateLeagueFormValues,
} from "../../../schemas/league.schema";
import {
  createLeagueDefaultValues,
  createLeagueFormSchema,
  toCreateLeagueInput,
} from "../../../schemas/league.schema";
import { getCreateLeagueErrorMessage } from "../utils/createLeagueError";
import { useCreateLeague } from "../../../hooks/useCreateLeague";
import { HttpError } from "../../../lib/httpClient";
import { uploadPhoto } from "../../../services/uploadPhoto.service";
import { Alert, Button, Checkbox, FormField, ImagePicker, Input } from "../../../ui";

interface CreateLeagueFormProps {
  onSuccess?: (league: League) => void;
}

function CreateLeagueForm({ onSuccess }: CreateLeagueFormProps) {
  const createLeagueMutation = useCreateLeague();
  const [logo, setLogo] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateLeagueFormValues, undefined, CreateLeagueFormData>({
    defaultValues: createLeagueDefaultValues,
    resolver: zodResolver(createLeagueFormSchema),
  });

  const pending = isSubmitting || createLeagueMutation.isPending;

  const onSubmit = async (values: CreateLeagueFormData) => {
    if (pending) return;

    const input = toCreateLeagueInput(values);

    try {
      if (logo) {
        const logoUrl = uploadedLogoUrl ?? (await uploadPhoto(logo));

        input.logoUrl = logoUrl;
        setUploadedLogoUrl(logoUrl);
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

    if (onSuccess == null) {
      createLeagueMutation.mutate(input);

      return;
    }

    createLeagueMutation.mutate(input, { onSuccess });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (pending) {
      event.preventDefault();

      return;
    }

    createLeagueMutation.reset();
    setUploadError(null);
    void handleSubmit(onSubmit)(event);
  };

  return (
    <form className={leagueStyles.formCard} noValidate onSubmit={handleFormSubmit}>
      <header className="grid gap-2">
        <h2 className="m-0 text-[24px]">Informations de la ligue</h2>
        <p className="m-0 text-[var(--color-text-secondary)]">
          Ajoutez une nouvelle ligue à votre espace.
        </p>
      </header>

      <div className={leagueStyles.formFields}>
        <FormField
          error={errors.name?.message}
          htmlFor="league-name"
          label="Nom"
          required
        >
          <Input
            id="league-name"
            disabled={pending}
            aria-describedby={errors.name ? "league-name-error" : undefined}
            hasError={errors.name != null}
            placeholder="Première Ligue"
            type="text"
            {...register("name")}
          />
        </FormField>

        <FormField
          error={errors.country?.message}
          htmlFor="league-country"
          label="Pays"
          required
        >
          <Input
            id="league-country"
            disabled={pending}
            aria-describedby={errors.country ? "league-country-error" : undefined}
            hasError={errors.country != null}
            placeholder="France"
            type="text"
            {...register("country")}
          />
        </FormField>

        <ImagePicker
          id="create-league-logo"
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

        <label
          className="flex items-center gap-2 text-[14px] text-[var(--color-text-primary)]"
          htmlFor="league-is-active"
        >
          <Checkbox id="league-is-active" disabled={pending} {...register("isActive")} />
          Ligue active
        </label>
      </div>

      {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
      {createLeagueMutation.isError ? (
        <Alert variant="danger">
          {getCreateLeagueErrorMessage(createLeagueMutation.error)}
        </Alert>
      ) : null}

      <div className={leagueStyles.formActions}>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Création..." : "Créer la ligue"}
        </Button>
      </div>
    </form>
  );
}

export { CreateLeagueForm };

export type { CreateLeagueFormProps };
