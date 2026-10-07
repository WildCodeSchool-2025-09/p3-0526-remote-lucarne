import { seasonStyles } from "../seasonStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Season } from "@lucarne/shared";
import { useForm } from "react-hook-form";
import type {
  CreateSeasonFormData,
  CreateSeasonFormValues,
} from "../../../schemas/season.schema";
import {
  createSeasonDefaultValues,
  createSeasonFormSchema,
  toCreateSeasonInput,
} from "../../../schemas/season.schema";
import { useCreateSeason } from "../hooks/useCreateSeason";
import { Alert, Button, FormField, Input } from "../../../ui";

interface CreateSeasonFormProps {
  onSuccess?: (season: Season) => void;
}

function CreateSeasonForm({ onSuccess }: CreateSeasonFormProps) {
  const mutation = useCreateSeason();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateSeasonFormValues, undefined, CreateSeasonFormData>({
    defaultValues: createSeasonDefaultValues,
    resolver: zodResolver(createSeasonFormSchema),
  });

  const onSubmit = (values: CreateSeasonFormData) => {
    mutation.mutate(toCreateSeasonInput(values), { onSuccess });
  };

  return (
    <form
      className={seasonStyles.formCard}
      noValidate
      onSubmit={(event) => {
        mutation.reset();

        void handleSubmit(onSubmit)(event);
      }}
    >
      <header className="grid gap-2">
        <h2 className="m-0 text-[24px]">Informations de la saison</h2>
        <p className="m-0 text-[var(--color-text-secondary)]">
          Définissez la période sportive commune aux ligues.
        </p>
      </header>
      <div className={seasonStyles.formFields}>
        <FormField
          error={errors.name?.message}
          htmlFor="season-name"
          label="Nom"
          required
        >
          <Input id="season-name" hasError={errors.name != null} {...register("name")} />
        </FormField>
        <FormField
          error={errors.startDate?.message}
          htmlFor="season-start-date"
          label="Date de début"
          required
        >
          <Input
            id="season-start-date"
            hasError={errors.startDate != null}
            type="date"
            {...register("startDate")}
          />
        </FormField>
        <FormField
          error={errors.endDate?.message}
          htmlFor="season-end-date"
          label="Date de fin"
          required
        >
          <Input
            id="season-end-date"
            hasError={errors.endDate != null}
            type="date"
            {...register("endDate")}
          />
        </FormField>
      </div>
      {mutation.isError ? <Alert variant="danger">{mutation.error.message}</Alert> : null}
      <div className={seasonStyles.formActions}>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Création…" : "Créer la saison"}
        </Button>
      </div>
    </form>
  );
}

export { CreateSeasonForm };
