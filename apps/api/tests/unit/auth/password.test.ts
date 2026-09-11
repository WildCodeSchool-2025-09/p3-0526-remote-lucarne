import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordSchema,
  verifyPassword,
} from "../../../src/auth/password";
import { beforeAll, describe, expect, it } from "vitest";

const password = "a-secure-password";
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword(password);
});

describe("password hashing", () => {
  it("does not store the original password", () => {
    expect(passwordHash).not.toBe(password);
  });

  it("verifies the correct password", async () => {
    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    await expect(verifyPassword("incorrect-password", passwordHash))
      .resolves.toBe(false);
  });

  it("generates different hashes for the same password", async () => {
    const secondPasswordHash = await hashPassword(password);

    expect(secondPasswordHash).not.toBe(passwordHash);
    await expect(verifyPassword(password, secondPasswordHash))
      .resolves.toBe(true);
  });
});

describe("password validation", () => {
  it("accepts passwords at the configured length boundaries", () => {
    expect(passwordSchema.safeParse("a".repeat(MIN_PASSWORD_LENGTH)).success)
      .toBe(true);
    expect(passwordSchema.safeParse("a".repeat(MAX_PASSWORD_LENGTH)).success)
      .toBe(true);
  });

  it("rejects passwords outside the configured length boundaries", () => {
    expect(passwordSchema.safeParse(
      "a".repeat(MIN_PASSWORD_LENGTH - 1),
    ).success).toBe(false);
    expect(passwordSchema.safeParse(
      "a".repeat(MAX_PASSWORD_LENGTH + 1),
    ).success).toBe(false);
  });

  it("prevents hashing an invalid password", async () => {
    await expect(hashPassword("too-short")).rejects.toThrow();
  });
});
