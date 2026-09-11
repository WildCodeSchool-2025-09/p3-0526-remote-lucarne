import type { League } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { updateLeague } from "../../../src/services/league.service";
import { useUpdateLeague } from "../../../src/hooks/useUpdateLeague";

vi.mock("../../../src/services/league.service", () => ({ updateLeague: vi.fn() }));

const mockedUpdateLeague = vi.mocked(updateLeague);
const updatedLeague: League = {
  id: "league-id",
  name: "Updated League",
  country: "France",
  logoUrl: null,
  status: "ACTIVE",
  isActive: true,
  version: 1,
  createdAt: "2026-09-11T10:00:00.000Z",
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUpdateLeague", () => {
  it("updates the detail cache and invalidates related queries after success", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue({} as never);
    mockedUpdateLeague.mockResolvedValue(updatedLeague);
    const { result } = renderHook(() => useUpdateLeague("league-id"), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ name: "Updated League", version: 0 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["league", "league-id"])).toEqual(updatedLeague);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["league", "league-id"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["leagues"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["league-countries"] });
  });
});
