import type { CreateLeagueInput, League } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../lib/httpClient";
import * as leagueService from "../services/league.service";
import { useCreateLeague } from "./useCreateLeague";

const input: CreateLeagueInput = {
  name: "Première Ligue",
  country: "France",
  isActive: true,
};

const league: League = {
  id: "league-id",
  name: "Première Ligue",
  country: "France",
  logoUrl: null,
  isActive: true,
  createdAt: "2026-09-10T10:00:00.000Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useCreateLeague", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the input to createLeague and exposes the successful response", async () => {
    const createLeague = vi
      .spyOn(leagueService, "createLeague")
      .mockResolvedValue(league);
    const { result } = renderHook(() => useCreateLeague(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createLeague).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(league);
  });

  it("exposes pending state while the creation is unresolved", async () => {
    let resolve: (value: League) => void = () => undefined;
    const pendingPromise = new Promise<League>((promiseResolve) => {
      resolve = promiseResolve;
    });
    vi.spyOn(leagueService, "createLeague").mockReturnValue(pendingPromise);
    const { result } = renderHook(() => useCreateLeague(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolve(league);
  });

  it("exposes the original HttpError without transforming it", async () => {
    const error = new HttpError(
      new Response(null, { status: 403, statusText: "Forbidden" }),
      { error: { code: "FORBIDDEN", message: "Forbidden" } },
    );
    vi.spyOn(leagueService, "createLeague").mockRejectedValue(error);
    const { result } = renderHook(() => useCreateLeague(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
  });
});
