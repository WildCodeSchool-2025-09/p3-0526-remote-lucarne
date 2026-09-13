import type { CreatePlayerInput, ListPlayersParams, Player, UpdatePlayerInput } from "@lucarne/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPlayer, deactivatePlayer, deletePlayer, getPlayer, listPlayers, updatePlayer } from "../services/player.service";
export const usePlayerList = (params: ListPlayersParams) => useQuery({ queryKey: ["players", params], queryFn: () => listPlayers(params), retry: false });
export const usePlayerDetail = (id: string) => useQuery({ queryKey: ["players", id], queryFn: () => getPlayer(id), enabled: id !== "", retry: false });
export const useCreatePlayer = () => { const c = useQueryClient(); return useMutation<Player, Error, CreatePlayerInput>({ mutationFn: createPlayer, onSuccess: () => c.invalidateQueries({ queryKey: ["players"] }), retry: false }); };
export const useUpdatePlayer = () => { const c = useQueryClient(); return useMutation<Player, Error, { id: string; input: UpdatePlayerInput }>({ mutationFn: ({ id, input }) => updatePlayer(id, input), onSuccess: () => c.invalidateQueries({ queryKey: ["players"] }), retry: false }); };
export const useDeactivatePlayer = () => { const c = useQueryClient(); return useMutation<Player, Error, string>({ mutationFn: deactivatePlayer, onSuccess: () => c.invalidateQueries({ queryKey: ["players"] }), retry: false }); };
export const useDeletePlayer = () => { const c = useQueryClient(); return useMutation<void, Error, string>({ mutationFn: deletePlayer, onSuccess: () => c.invalidateQueries({ queryKey: ["players"] }), retry: false }); };
