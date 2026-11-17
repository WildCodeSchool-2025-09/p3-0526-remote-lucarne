import type { PlayerDetail } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { playerKeys } from "../../../src/features/player/playerKeys";
import { teamKeys } from "../../../src/features/team/teamKeys";
import { useActivatePlayer, useCreatePlayer, useCreatePlayerAssignment, useDeactivatePlayer, useDeletePlayer, useUpdatePlayer, useUpdatePlayerAssignment } from "../../../src/hooks/usePlayer";
import { activatePlayer, createPlayer, createPlayerAssignment, deactivatePlayer, deletePlayer, updatePlayer, updatePlayerAssignment } from "../../../src/services/player.service";

vi.mock("../../../src/services/player.service", () => ({
  createPlayerAssignment: vi.fn(),
  createPlayer: vi.fn(),
  activatePlayer: vi.fn(),
  updatePlayer: vi.fn(),
  updatePlayerAssignment: vi.fn(),
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
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: teamKeys.rosters() });
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
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: teamKeys.rosters() });
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
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: teamKeys.rosters() });
  });

  it("invalidates lists and rosters after creation without adding a detail cache", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue({} as never);
    vi.mocked(createPlayer).mockResolvedValue(player);
    const { result } = renderHook(() => useCreatePlayer(), { wrapper: createWrapper(queryClient) });

    await result.current.mutateAsync({ firstName: player.firstName, lastName: player.lastName });

    expect(queryClient.getQueryData(playerKeys.detail(player.id))).toBeUndefined();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: playerKeys.lists() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: teamKeys.rosters() });
  });

  it("refreshes detail, lists and rosters after activation and information or date updates", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue({} as never);
    vi.mocked(activatePlayer).mockResolvedValue(player);
    vi.mocked(updatePlayer).mockResolvedValue(player);
    vi.mocked(updatePlayerAssignment).mockResolvedValue(player);
    const { result } = renderHook(() => ({
      activate: useActivatePlayer(),
      update: useUpdatePlayer(),
      updateAssignment: useUpdatePlayerAssignment(),
    }), { wrapper: createWrapper(queryClient) });

    const actions = [
      () => result.current.activate.mutateAsync(player.id),
      () => result.current.update.mutateAsync({ id: player.id, input: { firstName: "Ada", version: 1 } }),
      () => result.current.updateAssignment.mutateAsync({ id: player.id, assignmentId: "assignment-id", input: { joinedAt: "2026-01-01", leftAt: null } }),
    ];
    for (const action of actions) {
      queryClient.removeQueries({ queryKey: playerKeys.detail(player.id) });
      invalidateQueries.mockClear();
      await action();
      expect(queryClient.getQueryData(playerKeys.detail(player.id))).toEqual(player);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: playerKeys.lists() });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: teamKeys.rosters() });
    }
  });

  it("preserves the cache when an update fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue({} as never);
    queryClient.setQueryData(playerKeys.detail(player.id), player);
    vi.mocked(updatePlayer).mockRejectedValue(new Error("Version conflict"));
    const { result } = renderHook(() => useUpdatePlayer(), { wrapper: createWrapper(queryClient) });

    await expect(result.current.mutateAsync({ id: player.id, input: { firstName: "Ada", version: 0 } })).rejects.toThrow("Version conflict");

    expect(queryClient.getQueryData(playerKeys.detail(player.id))).toEqual(player);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
