import { z } from "zod";

const environmentSchema = z.object({
  VITE_API_URL: z.union([z.literal(""), z.url()]),
});

const environment = environmentSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL ?? "",
});

const apiUrl = environment.VITE_API_URL.replace(/\/$/, "");

export { apiUrl };
