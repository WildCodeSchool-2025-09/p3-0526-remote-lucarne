import type {
  CreatePlayerAssignmentInput,
  CreatePlayerInput,
  ListPlayersParams,
  PlayerDetail,
  UpdatePlayerAssignmentInput,
  UpdatePlayerInput,
} from "@lucarne/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { playerKeys } from "../features/player/playerKeys";
import { teamKeys } from "../features/team/teamKeys";
import {
  activatePlayer,
  createPlayer,
  createPlayerAssignment,
  deactivatePlayer,
  deletePlayer,
  getPlayer,
  listPlayers,
  updatePlayer,
  updatePlayerAssignment,
} from "../services/player.service";

export const usePlayerList = (params: ListPlayersParams) =>
  useQuery({
    queryKey: playerKeys.list(params),
    queryFn: () => listPlayers(params),
    retry: false,
  });

export const usePlayerDetail = (id: string) =>
  useQuery({
    queryKey: playerKeys.detail(id),
    queryFn: () => getPlayer(id),
    enabled: id !== "",
    retry: false,
  });

function usePlayerCache() {
  const queryClient = useQueryClient();

  const invalidateListsAndRosters = async () => {
    await queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
    await queryClient.invalidateQueries({ queryKey: teamKeys.rosters() });
  };

  const updateDetail = async (player: PlayerDetail) => {
    queryClient.setQueryData(playerKeys.detail(player.id), player);
    await invalidateListsAndRosters();
  };

  const removeDetail = async (_: void, id: string) => {
    queryClient.removeQueries({ queryKey: playerKeys.detail(id) });
    await invalidateListsAndRosters();
  };

  return { invalidateListsAndRosters, updateDetail, removeDetail };
}

export const useCreatePlayerAssignment = () => {
  const cache = usePlayerCache();

  return useMutation<
    PlayerDetail,
    Error,
    { id: string; input: CreatePlayerAssignmentInput }
  >({
    mutationFn: ({ id, input }) => createPlayerAssignment(id, input),
    onSuccess: cache.updateDetail,
    retry: false,
  });
};

export const useCreatePlayer = () => {
  const cache = usePlayerCache();

  return useMutation<PlayerDetail, Error, CreatePlayerInput>({
    mutationFn: createPlayer,
    onSuccess: cache.invalidateListsAndRosters,
    retry: false,
  });
};

export const useUpdatePlayer = () => {
  const cache = usePlayerCache();

  return useMutation<PlayerDetail, Error, { id: string; input: UpdatePlayerInput }>({
    mutationFn: ({ id, input }) => updatePlayer(id, input),
    onSuccess: cache.updateDetail,
    retry: false,
  });
};

export const useActivatePlayer = () => {
  const cache = usePlayerCache();

  return useMutation<PlayerDetail, Error, string>({
    mutationFn: activatePlayer,
    onSuccess: cache.updateDetail,
    retry: false,
  });
};

export const useDeactivatePlayer = () => {
  const cache = usePlayerCache();

  return useMutation<PlayerDetail, Error, string>({
    mutationFn: deactivatePlayer,
    onSuccess: cache.updateDetail,
    retry: false,
  });
};

export const useDeletePlayer = () => {
  const cache = usePlayerCache();

  return useMutation<void, Error, string>({
    mutationFn: deletePlayer,
    onSuccess: cache.removeDetail,
    retry: false,
  });
};

export const useUpdatePlayerAssignment = () => {
  const cache = usePlayerCache();

  return useMutation<
    PlayerDetail,
    Error,
    { id: string; assignmentId: string; input: UpdatePlayerAssignmentInput }
  >({
    mutationFn: ({ id, assignmentId, input }) =>
      updatePlayerAssignment(id, assignmentId, input),
    onSuccess: cache.updateDetail,
    retry: false,
  });
};
