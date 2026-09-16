import { zodResolver } from "@hookform/resolvers/zod";
import type { Season } from "@lucarne/shared";
import { useForm } from "react-hook-form";
import type { CreateSeasonFormData, CreateSeasonFormValues } from "../../../schemas/season.schema";
import { createSeasonDefaultValues, createSeasonFormSchema, toCreateSeasonInput } from "../../../schemas/season.schema";
import { useCreateSeason } from "../hooks/useCreateSeason";
import { Alert, Button, FormField, Input } from "../../../ui";

interface CreateSeasonFormProps {
  leagueId: string;
  onSuccess?: (season: Season) => void;
}

function CreateSeasonForm({ leagueId, onSuccess }: CreateSeasonFormProps) {
  const mutation = useCreateSeason(leagueId);
  const { formState: { errors }, handleSubmit, register } = useForm<CreateSeasonFormValues, undefined, CreateSeasonFormData>({
    defaultValues: createSeasonDefaultValues,
    resolver: zodResolver(createSeasonFormSchema),
  });

  const onSubmit = (values: CreateSeasonFormData) => {
    mutation.mutate(toCreateSeasonInput(values), { onSuccess });
  };

  return (
    <form className="create-league-form" noValidate onSubmit={(event) => { mutation.reset(); void handleSubmit(onSubmit)(event); }}>
      <header className="create-league-form__header"><h2 className="create-league-form__title">Informations de la saison</h2><p className="create-league-form__description">Définissez la période sportive de la ligue.</p></header>
      <div className="create-league-form__fields">
        <FormField error={errors.name?.message} htmlFor="season-name" label="Nom" required><Input id="season-name" hasError={errors.name != null} {...register("name")} /></FormField>
        <FormField error={errors.startDate?.message} htmlFor="season-start-date" label="Date de début" required><Input id="season-start-date" hasError={errors.startDate != null} type="date" {...register("startDate")} /></FormField>
        <FormField error={errors.endDate?.message} htmlFor="season-end-date" label="Date de fin" required><Input id="season-end-date" hasError={errors.endDate != null} type="date" {...register("endDate")} /></FormField>
      </div>
      {mutation.isError ? <Alert variant="danger">{mutation.error.message}</Alert> : null}
      <div className="create-league-form__actions"><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Création…" : "Créer la saison"}</Button></div>
    </form>
  );
}

export { CreateSeasonForm };
