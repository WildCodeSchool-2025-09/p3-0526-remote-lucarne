import { APP_ROLES, isAppRole } from "./appRole";
import { describe, expect, it } from "vitest";

describe("application roles", () => {
  it("defines exactly the supported application roles", () => {
    expect(APP_ROLES).toEqual({
      ADMIN: "ADMIN",
      MODERATOR: "MODERATOR",
      EDITOR: "EDITOR",
      USER: "USER",
    });
  });

  it.each(Object.values(APP_ROLES))(
    "recognizes %s as an application role",
    (role) => {
      expect(isAppRole(role)).toBe(true);
    },
  );

  it("rejects an unknown role", () => {
    expect(isAppRole("MODERATER")).toBe(false);
  });
});
