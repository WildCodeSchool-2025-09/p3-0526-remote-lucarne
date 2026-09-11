import { beforeEach, describe, expect, it } from "vitest";
import { clearAccessToken, setAccessToken } from "../lib/authToken";
import {
  APP_ROLES,
  canCreateLeague,
  decodeAccessToken,
  getCurrentAppRole,
  hasRole,
} from "./authRole";

function createToken(payload: Record<string, unknown>): string {
  const encode = (value: string) => btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${encode(JSON.stringify({ alg: "none" }))}.${encode(JSON.stringify(payload))}.signature`;
}

describe("auth role helpers", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  it.each([
    [APP_ROLES.ADMIN, true],
    [APP_ROLES.MODERATOR, true],
    [APP_ROLES.EDITOR, true],
    [APP_ROLES.USER, false],
  ])("checks whether a role is allowed", (role, expected) => {
    expect(hasRole(role, [APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR])).toBe(expected);
  });

  it("allows league creation only for the role currently accepted by the API", () => {
    expect(canCreateLeague(APP_ROLES.ADMIN)).toBe(true);
    expect(canCreateLeague(APP_ROLES.MODERATOR)).toBe(false);
    expect(canCreateLeague(APP_ROLES.EDITOR)).toBe(false);
    expect(canCreateLeague(APP_ROLES.USER)).toBe(false);
    expect(canCreateLeague(null)).toBe(false);
  });

  it("reads a valid role from the token without verifying its signature", () => {
    setAccessToken(createToken({ role: APP_ROLES.ADMIN, exp: Math.floor(Date.now() / 1000) + 60 }));

    expect(getCurrentAppRole()).toBe(APP_ROLES.ADMIN);
  });

  it.each([
    "malformed",
    "one.two",
    createToken({ role: "SUPERADMIN" }),
    createToken({}),
    createToken({ role: APP_ROLES.ADMIN, exp: Math.floor(Date.now() / 1000) - 1 }),
  ])("returns null for an invalid token: %s", (token) => {
    expect(decodeAccessToken(token)).toBeNull();
  });

  it("returns null when no token exists", () => {
    expect(getCurrentAppRole()).toBeNull();
  });
});
