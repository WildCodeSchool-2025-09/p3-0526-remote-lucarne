import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError, httpClient } from "../lib/httpClient";
import { createLeague } from "./league.service";

describe("league service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a league through the API and returns the typed response", async () => {
    const input = {
      name: "Première Ligue",
      country: "France",
      logoUrl: "https://example.com/logo.png",
      isActive: true,
    };
    const response = {
      id: "league-id",
      name: "Première Ligue",
      country: "France",
      logoUrl: "https://example.com/logo.png",
      isActive: true,
      createdAt: "2026-09-10T10:00:00.000Z",
    };
    const post = vi.spyOn(httpClient, "post").mockResolvedValue(response);

    await expect(createLeague(input)).resolves.toEqual(response);

    expect(post).toHaveBeenCalledWith("/leagues", { json: input });
  });

  it("propagates HttpError without transforming it", async () => {
    const error = new HttpError(
      new Response(null, { status: 409, statusText: "Conflict" }),
      { error: { code: "RESOURCE_CONFLICT", message: "League already exists" } },
    );
    vi.spyOn(httpClient, "post").mockRejectedValue(error);

    await expect(createLeague({
      name: "Première Ligue",
      country: "France",
      isActive: true,
    })).rejects.toBe(error);
  });
});
