import { zodResolver } from "@hookform/resolvers/zod";
import type { Team } from "@lucarne/shared";
import { useForm } from "react-hook-form";
import type { CreateTeamFormData, CreateTeamFormValues } from "../../../schemas/team.schema";
import {
  createTeamDefaultValues,
  createTeamFormSchema,
  toCreateTeamInput,
} from "../../../schemas/team.schema";
import { useCreateTeam } from "../../../hooks/useCreateTeam";
import { Alert, Button, FormField, Input } from "../../../ui";
import { getCreateTeamErrorMessage } from "../utils/createTeamError";

interface CreateTeamFormProps {
  onSuccess?: (team: Team) => void;
}

function CreateTeamForm({ onSuccess }: CreateTeamFormProps) {
  const createTeamMutation = useCreateTeam();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateTeamFormValues, undefined, CreateTeamFormData>({
    defaultValues: createTeamDefaultValues,
    resolver: zodResolver(createTeamFormSchema),
  });

  const onSubmit = (values: CreateTeamFormData) => {
    const input = toCreateTeamInput(values);

    createTeamMutation.mutate(input, onSuccess == null ? undefined : { onSuccess });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    createTeamMutation.reset();
    void handleSubmit(onSubmit)(event);
  };

  return (
    <form className="create-team-form" noValidate onSubmit={handleFormSubmit}>
      <header className="create-team-form__header">
        <h2 className="create-team-form__title">Informations de l’équipe</h2>
        <p className="create-team-form__description">
          Ajoutez une nouvelle équipe à votre espace.
        </p>
      </header>

      <div className="create-team-form__fields">
        <FormField error={errors.name?.message} htmlFor="team-name" label="Nom de l’équipe" required>
          <Input
            id="team-name"
            aria-describedby={errors.name ? "team-name-error" : undefined}
            hasError={errors.name != null}
            placeholder="Paris FC"
            type="text"
            {...register("name")}
          />
        </FormField>

        <FormField error={errors.logoUrl?.message} htmlFor="team-logo-url" label="URL du logo">
          <Input
            id="team-logo-url"
            aria-describedby={errors.logoUrl ? "team-logo-url-error" : undefined}
            hasError={errors.logoUrl != null}
            placeholder="https://example.com/logo.png"
            type="url"
            {...register("logoUrl")}
          />
        </FormField>

        <FormField error={errors.stadium?.message} htmlFor="team-stadium" label="Stade">
          <Input
            id="team-stadium"
            aria-describedby={errors.stadium ? "team-stadium-error" : undefined}
            hasError={errors.stadium != null}
            placeholder="Stade municipal"
            type="text"
            {...register("stadium")}
          />
        </FormField>
      </div>

      {createTeamMutation.isError ? (
        <Alert variant="danger">
          {getCreateTeamErrorMessage(createTeamMutation.error)}
        </Alert>
      ) : null}

      <div className="create-team-form__actions">
        <Button disabled={createTeamMutation.isPending} type="submit" variant="primary">
          {createTeamMutation.isPending ? "Création..." : "Créer l’équipe"}
        </Button>
      </div>
    </form>
  );
}

export { CreateTeamForm };
export type { CreateTeamFormProps };
