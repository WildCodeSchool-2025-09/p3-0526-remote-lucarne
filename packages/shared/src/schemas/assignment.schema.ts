import { z } from "zod";

const assignmentEndSchema = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().date().nullable().optional(),
);

const assignmentDatesSchema = z.object({
  joinedAt: z.string().date(),
  leftAt: assignmentEndSchema,
}).strict().refine(
  (value) => value.leftAt == null || value.leftAt > value.joinedAt,
  { message: "La date de fin doit être postérieure à la date de début.", path: ["leftAt"] },
);

export { assignmentDatesSchema, assignmentEndSchema };
