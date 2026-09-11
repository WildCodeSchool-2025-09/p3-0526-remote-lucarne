import type { CreateLeagueInput } from "@lucarne/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError, httpClient } from "../lib/httpClient";
import { activateLeague, createLeague, listLeagueCountries, updateLeague } from "./league.service";

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
      version: 0,
      createdAt: "2026-09-10T10:00:00.000Z",
    };
    const post = vi.spyOn(httpClient, "post").mockResolvedValue(response);

    await expect(createLeague(input)).resolves.toEqual(response);

    expect(post).toHaveBeenCalledWith("/leagues", { json: input });
  });

  it("does not send fields outside the creation contract", async () => {
    const input = {
      country: "France",
      createdAt: "2026-09-10T10:00:00.000Z",
      id: "unexpected-id",
      isActive: true,
      name: "Première Ligue",
      seasons: [],
      teams: [],
      user: { id: "unexpected-user" },
    } as CreateLeagueInput & Record<string, unknown>;
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({});

    await createLeague(input);

    expect(post).toHaveBeenCalledWith("/leagues", {
      json: {
        country: "France",
        isActive: true,
        logoUrl: undefined,
        name: "Première Ligue",
      },
    });
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

  it("lists registered league countries", async () => {
    const get = vi.spyOn(httpClient, "get").mockResolvedValue(["Espagne", "France"]);

    await expect(listLeagueCountries()).resolves.toEqual(["Espagne", "France"]);
    expect(get).toHaveBeenCalledWith("/leagues/countries");
  });

  it("activates a league through the API", async () => {
    const patch = vi.spyOn(httpClient, "patch").mockResolvedValue({});

    await activateLeague("league-id");
    expect(patch).toHaveBeenCalledWith("/leagues/league-id/activate");
  });

  it("updates a league with its current version", async () => {
    const patch = vi.spyOn(httpClient, "patch").mockResolvedValue({});
    const input = { name: "Updated League", version: 2 };

    await updateLeague("league-id", input);

    expect(patch).toHaveBeenCalledWith("/leagues/league-id", { json: input });
  });
});
