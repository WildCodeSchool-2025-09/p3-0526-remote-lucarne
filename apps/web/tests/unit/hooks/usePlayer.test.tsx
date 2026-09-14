import type { PlayerDetail } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { playerKeys } from "../../../src/features/player/playerKeys";
import { useCreatePlayerAssignment, useDeactivatePlayer, useDeletePlayer } from "../../../src/hooks/usePlayer";
import { createPlayerAssignment, deactivatePlayer, deletePlayer } from "../../../src/services/player.service";

vi.mock("../../../src/services/player.service", () => ({
  createPlayerAssignment: vi.fn(),
  deactivatePlayer: vi.fn(),
  deletePlayer: vi.fn(),
  getPlayer: vi.fn(),
  listPlayers: vi.fn(),
}));

const player: PlayerDetail = {
  activeTeam: null,
  assignments: [],
  birthday: null,
  createdAt: "2026-09-14T10:00:00.000Z",
  firstName: "Alex",
  id: "player-id",
  isActive: false,
  isSelectable: false,
  lastName: "Martin",
  nationality: null,
  pictureUrl: null,
  position: null,
  version: 1,
};

function createQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false } } });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("player mutation cache", () => {
  it("updates the detail and invalidates lists after planning an assignment", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue({} as never);
    vi.mocked(createPlayerAssignment).mockResolvedValue(player);
    const { result } = renderHook(() => useCreatePlayerAssignment(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ id: player.id, input: { joinedAt: "2099-01-01", teamId: "team-id" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(playerKeys.detail(player.id))).toEqual(player);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: playerKeys.lists() });
  });

  it("updates the detail and invalidates lists after deactivation", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue({} as never);
    vi.mocked(deactivatePlayer).mockResolvedValue(player);
    const { result } = renderHook(() => useDeactivatePlayer(), { wrapper: createWrapper(queryClient) });

    result.current.mutate(player.id);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(playerKeys.detail(player.id))).toEqual(player);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: playerKeys.lists() });
  });

  it("removes the detail cache and invalidates lists after deletion", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue({} as never);
    queryClient.setQueryData(playerKeys.detail(player.id), player);
    vi.mocked(deletePlayer).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeletePlayer(), { wrapper: createWrapper(queryClient) });

    result.current.mutate(player.id);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(playerKeys.detail(player.id))).toBeUndefined();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: playerKeys.lists() });
  });
});
