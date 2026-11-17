import { useQuery } from "@tanstack/react-query";
import type { PublicPlayerQuery } from "@lucarne/shared";
import { getPublicPlayer, listPublicPlayers } from "../../services/publicPlayer.service";
import { playerKeys } from "./playerKeys";

export const usePublicPlayers = (query: PublicPlayerQuery, enabled = true) => useQuery({ queryKey: [...playerKeys.lists(), "public", query], queryFn: () => listPublicPlayers(query), enabled });
export const usePublicPlayer = (id: string) => useQuery({ queryKey: [...playerKeys.detail(id), "public"], queryFn: () => getPublicPlayer(id) });
