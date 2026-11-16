import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "../../../src/services/league.service";
import { useCreateLeague } from "../../../src/hooks/useCreateLeague";
import { useUpdateLeague } from "../../../src/hooks/useUpdateLeague";
import { useLeagueMutation } from "../../../src/features/league/hooks/useLeagueMutation";
import { leagueKeys } from "../../../src/features/league/leagueKeys";

const league = { id: "league-id", name: "League", country: "France", logoUrl: null, version: 0, createdAt: "2026-10-11T00:00:00Z" };

describe("Public navigation cache after administrative changes", () => {
  beforeEach(() => {
    vi.spyOn(service, "createLeague").mockResolvedValue(league);
    vi.spyOn(service, "updateLeague").mockResolvedValue(league);
    vi.spyOn(service, "activateLeague").mockResolvedValue(league);
    vi.spyOn(service, "deactivateLeague").mockResolvedValue(league);
    vi.spyOn(service, "deleteLeague").mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["create", "rename", "activate", "deactivate", "delete"] as const)("marks public data stale after %s succeeds", async (action) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(leagueKeys.publicNavigation(), [{ id: league.id, slug: "league", name: league.name, country: league.country, logoUrl: null }]);
    client.setQueryData(leagueKeys.publicDetail("league"), { id: league.id, slug: "league", name: league.name, logoUrl: null, seasons: [] });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => ({ create: useCreateLeague(), update: useUpdateLeague(league.id), change: useLeagueMutation() }), { wrapper });
    act(() => {
      if (action === "create") result.current.create.mutate({ name: league.name, country: league.country });
      else if (action === "rename") result.current.update.mutate({ version: 0, name: "Renamed" });
      else result.current.change.mutate({ action, id: league.id });
    });
    await waitFor(() => expect(client.getQueryState(leagueKeys.publicNavigation())?.isInvalidated).toBe(true));
    if (action !== "create") expect(client.getQueryState(leagueKeys.publicDetail("league"))?.isInvalidated).toBe(true);
    unmount(); client.clear();
  });
});
