import { describe, expect, it } from "vitest";
import { HttpError } from "../../../../src/lib/httpClient";
import {
  createLeagueErrorMessages,
  getCreateLeagueErrorMessage,
} from "../../../../src/features/league/utils/createLeagueError";

function createHttpError(status: number, code = "API_ERROR") {
  return new HttpError(
    new Response(null, { status }),
    { error: { code, message: "Technical backend message" } },
  );
}

describe("getCreateLeagueErrorMessage", () => {
  it.each([
    [400, createLeagueErrorMessages.badRequest],
    [401, createLeagueErrorMessages.unauthorized],
    [403, createLeagueErrorMessages.forbidden],
    [409, createLeagueErrorMessages.conflict],
    [500, createLeagueErrorMessages.server],
    [503, createLeagueErrorMessages.server],
  ])("maps HTTP %i to a user message", (status, message) => {
    expect(getCreateLeagueErrorMessage(createHttpError(status))).toBe(message);
  });

  it("prioritizes the stable duplicate code", () => {
    expect(
      getCreateLeagueErrorMessage(createHttpError(409, "RESOURCE_ALREADY_EXISTS")),
    ).toBe(createLeagueErrorMessages.conflict);
  });

  it("uses the network fallback for non-HTTP errors", () => {
    expect(getCreateLeagueErrorMessage(new TypeError("Failed to fetch"))).toBe(
      createLeagueErrorMessages.network,
    );
  });

  it("does not expose technical backend details", () => {
    const message = getCreateLeagueErrorMessage(
      new HttpError(
        new Response(null, { status: 409 }),
        { error: { code: "RESOURCE_ALREADY_EXISTS", message: "P2002 Prisma stack trace" } },
      ),
    );

    expect(message).not.toContain("P2002");
    expect(message).not.toContain("Prisma");
    expect(message).not.toContain("stack trace");
  });
});
