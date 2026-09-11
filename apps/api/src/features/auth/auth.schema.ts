import { z } from "zod";
import { passwordSchema } from "../../auth/password";

const loginBodySchema = z.object({
  email: z.email().max(320),
  password: passwordSchema,
}).strict();

type LoginBody = z.infer<typeof loginBodySchema>;

export { loginBodySchema };
export type { LoginBody };
