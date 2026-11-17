import { describe, expect, it } from "vitest";
import { loginInputSchema, registerInputSchema } from "../../../src/schemas/auth.schema";

const input = { firstName: "Test", lastName: "User", email: "user@example.com", password: "Password1" };

describe("Public authentication contracts", () => {
  it.each(["Short1", "password1", "Password", "a".repeat(129)])("rejects an insufficient registration password: %s", (password) => {
    expect(registerInputSchema.safeParse({ ...input, password }).success).toBe(false);
  });
  it("accepts the minimum password and preserves existing login passwords", () => {
    expect(registerInputSchema.safeParse({ ...input, password: "Abcdefg1" }).success).toBe(true);
    expect(loginInputSchema.safeParse({ email: input.email, password: "a" }).success).toBe(true);
  });
  it.each([{ role: "ADMIN" }, { roleId: "admin-id" }, { status: "ACTIVE" }])("rejects client-selected privileges %j", (extra) => {
    expect(registerInputSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  });
  it.each([{ firstName: " " }, { lastName: " " }, { email: "invalid" }])("rejects invalid identity fields %j", (extra) => {
    expect(registerInputSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  });
});
