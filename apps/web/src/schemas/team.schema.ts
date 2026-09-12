import { createTeamInputSchema } from "@lucarne/shared";
import type { CreateTeamInput, UpdateTeamInput } from "@lucarne/shared";
import { z } from "zod";
import type { input, output } from "zod";

const createTeamFormSchema = createTeamInputSchema;

type CreateTeamFormValues = input<typeof createTeamFormSchema>;
type CreateTeamFormData = output<typeof createTeamFormSchema>;

const createTeamDefaultValues = {
  name: "",
  logoUrl: "",
  stadium: "",
} satisfies CreateTeamFormValues;

const updateTeamFormSchema = z.object({ name: z.string().trim().min(1, "Nom requis").max(150), logoUrl: z.string().trim().pipe(z.union([z.literal(""), z.url()])), stadium: z.string().trim().max(150), isActive: z.boolean() }).strict();
type UpdateTeamFormValues = z.input<typeof updateTeamFormSchema>;
function toUpdateTeamInput(values: UpdateTeamFormValues, canEditStatus: boolean): UpdateTeamInput { return { name: values.name, logoUrl: values.logoUrl === "" ? null : values.logoUrl, stadium: values.stadium === "" ? null : values.stadium, ...(canEditStatus ? { isActive: values.isActive } : {}) }; }

function toCreateTeamInput(values: CreateTeamFormValues): CreateTeamInput {
  return createTeamFormSchema.parse(values);
}

export {
  createTeamDefaultValues,
  createTeamFormSchema,
  toCreateTeamInput,
  toUpdateTeamInput,
  updateTeamFormSchema,
};
export type { CreateTeamFormData, CreateTeamFormValues, UpdateTeamFormValues };
