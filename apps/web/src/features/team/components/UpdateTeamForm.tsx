import { teamStyles } from "../teamStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Team } from "@lucarne/shared";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useUpdateTeam } from "../../../hooks/useUpdateTeam";
import { HttpError } from "../../../lib/httpClient";
import { uploadPhoto } from "../../../services/uploadPhoto.service";
import { toUpdateTeamInput, updateTeamFormSchema } from "../../../schemas/team.schema";
import type { UpdateTeamFormValues } from "../../../schemas/team.schema";
import { Alert, AlertModal, Button, Checkbox, EntityLogo, FormField, ImagePicker, Input } from "../../../ui";

interface UpdateTeamFormProps {
  team: Team;
  canEditStatus: boolean;
  onCancel: () => void;
  onSuccess: (team: Team) => void;
}

export function UpdateTeamForm(props: UpdateTeamFormProps) {
  return <TeamForm key={props.team.id} {...props} />;
}

function TeamForm({ team, canEditStatus, onCancel, onSuccess }: UpdateTeamFormProps) {
  const mutation = useUpdateTeam(team.id);
  const [logo, setLogo] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateTeamFormValues>({
    defaultValues: {
      name: team.name,
      logoUrl: team.logoUrl ?? "",
      stadium: team.stadium ?? "",
      isActive: team.isActive,
    },
    resolver: zodResolver(updateTeamFormSchema),
  });
  const logoUrl = useWatch({ control, name: "logoUrl" });
  const pending = isSubmitting || mutation.isPending;

  useEffect(() => {
    reset({
      name: team.name,
      logoUrl: team.logoUrl ?? "",
      stadium: team.stadium ?? "",
      isActive: team.isActive,
    });
  }, [reset, team]);

  const submit = handleSubmit(async (values) => {
    const input = toUpdateTeamInput(values, canEditStatus);

    try {
      if (logo) {
        const uploadedUrl = uploadedLogoUrl ?? (await uploadPhoto(logo));

        input.logoUrl = uploadedUrl;
        setUploadedLogoUrl(uploadedUrl);
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

    mutation.mutate(input, {
      onSuccess: (updated) => {
        reset({
          name: updated.name,
          logoUrl: updated.logoUrl ?? "",
          stadium: updated.stadium ?? "",
          isActive: updated.isActive,
        });
        setLogo(null);
        setUploadedLogoUrl(null);
        setUploadError(null);
        onSuccess(updated);
      },
    });
  });

  return (
    <form
      className={teamStyles.formCard}
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();

          return;
        }

        mutation.reset();
        setUploadError(null);
        void submit(event);
      }}
      noValidate
    >
      <FormField
        label="Nom"
        htmlFor="update-team-name"
        error={errors.name?.message}
        required
      >
        <Input id="update-team-name" disabled={pending} {...register("name")} />
      </FormField>
      {logoUrl && !logo ? <EntityLogo logoUrl={logoUrl} name={team.name} /> : null}
      <ImagePicker
        id="update-team-logo"
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
      <FormField
        label="Stade"
        htmlFor="update-team-stadium"
        error={errors.stadium?.message}
      >
        <Input id="update-team-stadium" disabled={pending} {...register("stadium")} />
      </FormField>
      {canEditStatus ? (
        <label>
          <Checkbox disabled={pending} {...register("isActive")} /> Équipe active
        </label>
      ) : null}
      {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
      {mutation.isError ? (
        <AlertModal>Impossible de modifier l’équipe.</AlertModal>
      ) : null}
      <div className={teamStyles.formActions}>
        <Button disabled={pending} type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={(!isDirty && !logo) || pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
