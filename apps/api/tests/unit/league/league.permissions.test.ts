import { describe, expect, it } from "vitest";
import { APP_ROLES } from "../../../src/auth/appRole";
import { getLeaguePermissions } from "../../../src/features/league/league.service";

describe("getLeaguePermissions", () => {
  it.each([
    [APP_ROLES.ADMIN, { canView: true, canDelete: true }],
    [APP_ROLES.MODERATOR, { canView: true, canDelete: false }],
    [APP_ROLES.EDITOR, { canView: true, canDelete: false }],
    [APP_ROLES.USER, { canView: false, canDelete: false }],
  ])("returns permissions for %s", (role, expected) => {
    expect(getLeaguePermissions(role)).toEqual(expected);
  });
});
