import { z } from "zod";
import { assignmentDatesSchema, assignmentEndSchema } from "./assignment.schema";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
} from "../constants/pagination";

const optionalText = (maxLength: number) =>
  z.preprocess(
    (input) => (typeof input === "string" && input.trim() === "" ? null : input),
    z.string().trim().max(maxLength).nullable().optional(),
  );

const optionalDate = z.preprocess(
  (input) => (typeof input === "string" && input.trim() === "" ? null : input),
  z.string().date().nullable().optional(),
);

const playerFields = {
  firstName: z.string({ error: "Prénom requis" }).trim().min(1, "Prénom requis").max(100),
  lastName: z.string({ error: "Nom requis" }).trim().min(1, "Nom requis").max(100),
  nationality: optionalText(100),
  position: optionalText(50),
  birthday: optionalDate,
  pictureUrl: z.preprocess(
    (input) => (typeof input === "string" && input.trim() === "" ? null : input),
    z.string().trim().url().nullable().optional(),
  ),
};

const createPlayerInputSchema = z
  .object({
    ...playerFields,
    teamId: z.string().uuid().optional(),
    joinedAt: z.string().date().optional(),
    leftAt: assignmentEndSchema,
    shirtNumber: z.number().int().min(1).max(99).nullable().optional(),
  })
  .strict()
  .refine((input) => !input.teamId || input.joinedAt != null, {
    message: "La date d'arrivée est requise avec une équipe",
    path: ["joinedAt"],
  })
  .superRefine((input, context) => {
    if (input.leftAt != null && (!input.teamId || !input.joinedAt))
      context.addIssue({
        code: "custom",
        message: "Une date de fin requiert une équipe et une date de début.",
        path: ["leftAt"],
      });
    if (input.leftAt != null && input.joinedAt && input.leftAt <= input.joinedAt)
      context.addIssue({
        code: "custom",
        message: "La date de fin doit être postérieure à la date de début.",
        path: ["leftAt"],
      });
  });

const createPlayerAssignmentInputSchema = z
  .object({
    teamId: z.string().uuid(),
    joinedAt: z.string().date(),
    leftAt: assignmentEndSchema,
    shirtNumber: z.number().int().min(1).max(99).nullable().optional(),
  })
  .strict()
  .refine((input) => input.leftAt == null || input.leftAt > input.joinedAt, {
    message: "La date de fin doit être postérieure à la date de début.",
    path: ["leftAt"],
  });

const updatePlayerAssignmentInputSchema = assignmentDatesSchema;

const playerAssignmentParamsSchema = z
  .object({ playerId: z.string().uuid(), assignmentId: z.string().uuid() })
  .strict();

const updatePlayerInputSchema = z
  .object(playerFields)
  .partial()
  .extend({ isActive: z.boolean().optional(), version: z.number().int().min(0) })
  .strict()
  .refine(
    (input) =>
      Object.entries(input).some(([key, value]) => key !== "version" && value !== undefined),
    { message: "Au moins un champ doit être modifié" },
  );

const playerListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    pageSize: z.coerce
      .number()
      .int()
      .refine((input) => input === DEFAULT_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    search: z.preprocess(
      (input) => (typeof input === "string" ? input.trim() || undefined : input),
      z.string().max(MAX_SEARCH_LENGTH).optional(),
    ),
    teamName: z.string().trim().min(1).optional(),
    assignmentStatus: z.enum(["CURRENT", "PLANNED"]).optional(),
    selectable: z.preprocess(
      (value) => (value === "true" ? true : value === "false" ? false : value),
      z.boolean().optional(),
    ),
    position: z.string().trim().min(1).optional(),
    status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
    sortBy: z.enum(["lastName", "createdAt"]).default("lastName"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict();

const playerIdParamsSchema = z.object({ playerId: z.string().uuid() }).strict();

const deletePlayerBodySchema = z.object({ confirm: z.literal(true) }).strict();

export {
  updatePlayerAssignmentInputSchema,
  playerAssignmentParamsSchema,
  createPlayerAssignmentInputSchema,
  createPlayerInputSchema,
  deletePlayerBodySchema,
  playerIdParamsSchema,
  playerListQuerySchema,
  updatePlayerInputSchema,
};
