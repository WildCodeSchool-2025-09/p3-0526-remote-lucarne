import { describe, expect, it } from "vitest";
import { APP_ROLES } from "../../../src/auth/appRole";
import { TEAM_CREATE_ROLES } from "../../../src/features/team/team.permissions";

describe("TEAM_CREATE_ROLES", () => {
  it("allows only the three authorized roles", () => {
    expect(TEAM_CREATE_ROLES).toEqual([
      APP_ROLES.ADMIN,
      APP_ROLES.MODERATOR,
      APP_ROLES.EDITOR,
    ]);
    expect(TEAM_CREATE_ROLES).not.toContain(APP_ROLES.USER);
  });
});
