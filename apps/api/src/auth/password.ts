import { argon2id, hash, verify } from "argon2";
import { z } from "zod";

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must contain at least ${MIN_PASSWORD_LENGTH} characters`,
  )
  .max(
    MAX_PASSWORD_LENGTH,
    `Password must contain at most ${MAX_PASSWORD_LENGTH} characters`,
  );

const hashPassword = async (password: string): Promise<string> => {
  const validatedPassword = passwordSchema.parse(password);

  return hash(validatedPassword, { type: argon2id });
};

const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => verify(passwordHash, password);

export {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordSchema,
  verifyPassword,
};
