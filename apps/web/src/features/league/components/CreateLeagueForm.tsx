import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { CreateLeagueFormData, CreateLeagueFormValues } from "../../../schemas/league.schema";
import {
  createLeagueDefaultValues,
  createLeagueFormSchema,
  toCreateLeagueInput,
} from "../../../schemas/league.schema";
import { useCreateLeague } from "../../../hooks/useCreateLeague";
import { Button, Checkbox, FormField, Input } from "../../../ui";

function CreateLeagueForm() {
  const createLeagueMutation = useCreateLeague();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateLeagueFormValues, undefined, CreateLeagueFormData>({
    defaultValues: createLeagueDefaultValues,
    resolver: zodResolver(createLeagueFormSchema),
  });

  const onSubmit = (values: CreateLeagueFormData) => {
    createLeagueMutation.mutate(toCreateLeagueInput(values));
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event);
  };

  return (
    <form className="create-league-form" noValidate onSubmit={handleFormSubmit}>
      <header className="create-league-form__header">
        <h1 className="create-league-form__title">Créer une ligue</h1>
        <p className="create-league-form__description">
          Ajoutez une nouvelle ligue à votre espace.
        </p>
      </header>

      <div className="create-league-form__fields">
        <FormField error={errors.name?.message} htmlFor="league-name" label="Nom" required>
          <Input
            id="league-name"
            aria-describedby={errors.name ? "league-name-error" : undefined}
            hasError={errors.name != null}
            placeholder="Première Ligue"
            type="text"
            {...register("name")}
          />
        </FormField>

        <FormField error={errors.country?.message} htmlFor="league-country" label="Pays" required>
          <Input
            id="league-country"
            aria-describedby={errors.country ? "league-country-error" : undefined}
            hasError={errors.country != null}
            placeholder="France"
            type="text"
            {...register("country")}
          />
        </FormField>

        <FormField error={errors.logoUrl?.message} htmlFor="league-logo-url" label="URL du logo">
          <Input
            id="league-logo-url"
            aria-describedby={errors.logoUrl ? "league-logo-url-error" : undefined}
            hasError={errors.logoUrl != null}
            placeholder="https://example.com/logo.png"
            type="url"
            {...register("logoUrl")}
          />
        </FormField>

        <label className="create-league-form__checkbox-label create-league-form__checkbox" htmlFor="league-is-active">
          <Checkbox id="league-is-active" {...register("isActive")} />
          Ligue active
        </label>
      </div>

      {createLeagueMutation.isError ? (
        <p className="lucarne-form-error" role="alert">
          Impossible de créer la ligue pour le moment.
        </p>
      ) : null}

      <div className="create-league-form__actions">
        <Button disabled={createLeagueMutation.isPending} type="submit" variant="primary">
          {createLeagueMutation.isPending ? "Création..." : "Créer la ligue"}
        </Button>
      </div>
    </form>
  );
}

export { CreateLeagueForm };
