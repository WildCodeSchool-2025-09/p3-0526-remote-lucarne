import { zodResolver } from "@hookform/resolvers/zod";
import type { League } from "@lucarne/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { UpdateLeagueFormData, UpdateLeagueFormValues } from "../../../schemas/league.schema";
import {
  toUpdateLeagueInput,
  updateLeagueFormSchema,
} from "../../../schemas/league.schema";
import { useUpdateLeague } from "../../../hooks/useUpdateLeague";
import { Alert, Button, Checkbox, FormField, Input } from "../../../ui";

interface UpdateLeagueFormProps {
  league: League;
  canEditStatus: boolean;
  onCancel: () => void;
  onReload: () => void;
  onSuccess: (league: League) => void;
}

const fieldNames = ["name", "country", "logoUrl", "isActive"] as const;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== "" ? error.message : fallback;
}

function UpdateLeagueForm({ league, canEditStatus, onCancel, onReload, onSuccess }: UpdateLeagueFormProps) {
  const mutation = useUpdateLeague(league.id);
  const {
    formState: { dirtyFields, errors, isDirty },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<UpdateLeagueFormValues, undefined, UpdateLeagueFormData>({
    defaultValues: {
      name: league.name,
      country: league.country,
      logoUrl: league.logoUrl ?? "",
      isActive: league.isActive ?? league.status === "ACTIVE",
    },
    resolver: zodResolver(updateLeagueFormSchema),
  });

  useEffect(() => {
    reset({
      name: league.name,
      country: league.country,
      logoUrl: league.logoUrl ?? "",
      isActive: league.isActive ?? league.status === "ACTIVE",
    });
  }, [league, reset]);

  useEffect(() => {
    if (mutation.error == null) return;

    for (const detail of mutation.error.details ?? []) {
      if ((fieldNames as readonly string[]).includes(detail.field)) {
        setError(detail.field as keyof UpdateLeagueFormData, { message: detail.message });
      }
    }
  }, [mutation.error, setError]);

  const onSubmit = (values: UpdateLeagueFormData) => {
    const input = toUpdateLeagueInput(values, dirtyFields, league.version, canEditStatus);
    mutation.mutate(input, { onSuccess });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    mutation.reset();
    void handleSubmit(onSubmit)(event);
  };

  const isVersionConflict = mutation.error instanceof Error
    && "code" in mutation.error
    && mutation.error.code === "RESOURCE_VERSION_CONFLICT";

  return (
    <form className="create-league-form update-league-form" noValidate onSubmit={handleFormSubmit}>
      <header className="create-league-form__header">
        <h2 className="create-league-form__title">Modifier la ligue</h2>
        <p className="create-league-form__description">Mettez à jour les informations de la ligue.</p>
      </header>

      <div className="create-league-form__fields">
        <FormField error={errors.name?.message} htmlFor="update-league-name" label="Nom" required>
          <Input id="update-league-name" hasError={errors.name != null} {...register("name")} />
        </FormField>
        <FormField error={errors.country?.message} htmlFor="update-league-country" label="Pays" required>
          <Input id="update-league-country" hasError={errors.country != null} {...register("country")} />
        </FormField>
        <FormField error={errors.logoUrl?.message} htmlFor="update-league-logo-url" label="URL du logo">
          <Input id="update-league-logo-url" hasError={errors.logoUrl != null} type="url" {...register("logoUrl")} />
        </FormField>
        {canEditStatus ? (
          <label className="create-league-form__checkbox-label create-league-form__checkbox" htmlFor="update-league-is-active">
            <Checkbox id="update-league-is-active" {...register("isActive")} />
            Ligue active
          </label>
        ) : null}
      </div>

      {isVersionConflict ? (
        <Alert variant="danger">
          Cette ligue a été modifiée par un autre utilisateur. Rechargez les données avant de réessayer.
          <Button onClick={onReload} type="button" variant="outline">Recharger les données</Button>
        </Alert>
      ) : null}
      {mutation.isError && !isVersionConflict ? (
        <Alert variant="danger">{getErrorMessage(mutation.error, "La ligue n’a pas pu être modifiée.")}</Alert>
      ) : null}

      <div className="create-league-form__actions">
        <Button disabled={mutation.isPending} onClick={onCancel} type="button" variant="ghost">Annuler</Button>
        <Button disabled={mutation.isPending || !isDirty} type="submit" variant="primary">
          {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

export { UpdateLeagueForm };
export type { UpdateLeagueFormProps };
