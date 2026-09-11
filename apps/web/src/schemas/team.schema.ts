import { createTeamInputSchema } from "@lucarne/shared";
import type { CreateTeamInput } from "@lucarne/shared";
import type { input, output } from "zod";

const createTeamFormSchema = createTeamInputSchema;

type CreateTeamFormValues = input<typeof createTeamFormSchema>;
type CreateTeamFormData = output<typeof createTeamFormSchema>;

const createTeamDefaultValues = {
  name: "",
  logoUrl: "",
  stadium: "",
} satisfies CreateTeamFormValues;

function toCreateTeamInput(values: CreateTeamFormValues): CreateTeamInput {
  return createTeamFormSchema.parse(values);
}

export {
  createTeamDefaultValues,
  createTeamFormSchema,
  toCreateTeamInput,
};
export type { CreateTeamFormData, CreateTeamFormValues };
