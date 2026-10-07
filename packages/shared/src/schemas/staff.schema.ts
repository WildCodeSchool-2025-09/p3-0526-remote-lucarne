import { z } from "zod";
import { assignmentDatesSchema, assignmentEndSchema } from "./assignment.schema";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH } from "../constants/pagination";

const optionalPictureUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().url().nullable().optional(),
);

const staffFields = {
  firstName: z.string({ error: "Prénom requis" }).trim().min(1, "Prénom requis").max(100),
  lastName: z.string({ error: "Nom requis" }).trim().min(1, "Nom requis").max(100),
  nationality: z.string({ error: "Nationalité requise" }).trim().min(1, "Nationalité requise").max(100),
  pictureUrl: optionalPictureUrl,
};

const staffAssignmentFields = {
  teamId: z.string().uuid(),
  jobTitle: z.string({ error: "Intitulé de poste requis" }).trim().min(1, "Intitulé de poste requis").max(100),
  joinedAt: z.string().date(),
  leftAt: assignmentEndSchema,
};

const createStaffMemberInputSchema = z.object({
  ...staffFields,
  teamId: staffAssignmentFields.teamId.optional(),
  jobTitle: staffAssignmentFields.jobTitle.optional(),
  joinedAt: staffAssignmentFields.joinedAt.optional(),
  leftAt: assignmentEndSchema,
}).strict().superRefine((value, context) => {
  const hasAssignmentValue = value.teamId !== undefined || value.jobTitle !== undefined || value.joinedAt !== undefined || value.leftAt != null;
  if (!hasAssignmentValue) return;
  if (value.leftAt != null && value.joinedAt && value.leftAt <= value.joinedAt)
    context.addIssue({
      code: "custom",
      message: "La date de fin doit être postérieure à la date de début.",
      path: ["leftAt"],
    });
  for (const field of ["teamId", "jobTitle", "joinedAt"] as const) {
    if (value[field] === undefined)
      context.addIssue({
        code: "custom",
        message: "Une affectation requiert une équipe, un intitulé de poste et une date d’arrivée",
        path: [field],
      });
  }
});

const createStaffAssignmentInputSchema = z.object(staffAssignmentFields).strict().refine(
  (input) => input.leftAt == null || input.leftAt > input.joinedAt,
  {
    message: "La date de fin doit être postérieure à la date de début.",
    path: ["leftAt"],
  },
);

const updateStaffAssignmentInputSchema = assignmentDatesSchema;

const staffAssignmentParamsSchema = z.object({ staffMemberId: z.string().uuid(), assignmentId: z.string().uuid() }).strict();

const updateStaffMemberInputSchema = z.object(staffFields).partial().extend({
  isActive: z.boolean().optional(),
  version: z.number().int().min(0),
}).strict().refine(
  (value) => Object.entries(value).some(([key, fieldValue]) => key !== "version" && fieldValue !== undefined),
  { message: "Au moins un champ doit être modifié" },
);

const staffMemberListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().refine((value) => value === DEFAULT_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.preprocess(
    (value) => typeof value === "string" ? value.trim() || undefined : value,
    z.string().max(MAX_SEARCH_LENGTH).optional(),
  ),
  teamName: z.string().trim().min(1).optional(),
  assignmentStatus: z.enum(["CURRENT", "PLANNED"]).optional(),
  selectable: z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean().optional()),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  sortBy: z.enum(["lastName", "createdAt"]).default("lastName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

const staffMemberIdParamsSchema = z.object({ staffMemberId: z.string().uuid() }).strict();

const deleteStaffMemberBodySchema = z.object({ confirm: z.literal(true) }).strict();

export {
  updateStaffAssignmentInputSchema,
  staffAssignmentParamsSchema,
  createStaffAssignmentInputSchema,
  createStaffMemberInputSchema,
  deleteStaffMemberBodySchema,
  staffMemberIdParamsSchema,
  staffMemberListQuerySchema,
  updateStaffMemberInputSchema,
};
