import { teamStyles } from "../teamStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Team } from "@lucarne/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type {
  CreateTeamFormData,
  CreateTeamFormValues,
} from "../../../schemas/team.schema";
import {
  createTeamDefaultValues,
  createTeamFormSchema,
  toCreateTeamInput,
} from "../../../schemas/team.schema";
import { useCreateTeam } from "../../../hooks/useCreateTeam";
import { HttpError } from "../../../lib/httpClient";
import { uploadPhoto } from "../../../services/uploadPhoto.service";
import { Alert, Button, FormField, ImagePicker, Input } from "../../../ui";
import { getCreateTeamErrorMessage } from "../utils/createTeamError";

interface CreateTeamFormProps {
  onSuccess?: (team: Team) => void;
}

function CreateTeamForm({ onSuccess }: CreateTeamFormProps) {
  const createTeamMutation = useCreateTeam();
  const [logo, setLogo] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateTeamFormValues, undefined, CreateTeamFormData>({
    defaultValues: createTeamDefaultValues,
    resolver: zodResolver(createTeamFormSchema),
  });

  const pending = isSubmitting || createTeamMutation.isPending;

  const onSubmit = async (values: CreateTeamFormData) => {
    if (pending) return;

    const input = toCreateTeamInput(values);

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

    createTeamMutation.mutate(input, onSuccess == null ? undefined : { onSuccess });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (pending) {
      event.preventDefault();

      return;
    }

    createTeamMutation.reset();
    setUploadError(null);
    void handleSubmit(onSubmit)(event);
  };

  return (
    <form className={teamStyles.formCard} noValidate onSubmit={handleFormSubmit}>
      <header className={teamStyles.formFields}>
        <h2 className={teamStyles.formTitle}>Informations de l’équipe</h2>
        <p className={teamStyles.description}>
          Ajoutez une nouvelle équipe à votre espace.
        </p>
      </header>

      <div className={teamStyles.formFields}>
        <FormField
          error={errors.name?.message}
          htmlFor="team-name"
          label="Nom de l’équipe"
          required
        >
          <Input
            id="team-name"
            disabled={pending}
            aria-describedby={errors.name ? "team-name-error" : undefined}
            hasError={errors.name != null}
            placeholder="Paris FC"
            type="text"
            {...register("name")}
          />
        </FormField>

        <ImagePicker
          id="create-team-logo"
          label="Logo de l’équipe"
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

        <FormField error={errors.stadium?.message} htmlFor="team-stadium" label="Stade">
          <Input
            id="team-stadium"
            disabled={pending}
            aria-describedby={errors.stadium ? "team-stadium-error" : undefined}
            hasError={errors.stadium != null}
            placeholder="Stade municipal"
            type="text"
            {...register("stadium")}
          />
        </FormField>
      </div>

      {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
      {createTeamMutation.isError ? (
        <Alert variant="danger">
          {getCreateTeamErrorMessage(createTeamMutation.error)}
        </Alert>
      ) : null}

      <div className={teamStyles.formActions}>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Création..." : "Créer l’équipe"}
        </Button>
      </div>
    </form>
  );
}

export { CreateTeamForm };
export type { CreateTeamFormProps };
