import type { PaginatedResponse } from "./pagination.types";

type PlayerStatus = "ACTIVE" | "INACTIVE";
type PlayerStatusFilter = "ALL" | PlayerStatus;
type Player = { id: string; firstName: string; lastName: string; nationality: string | null; position: string | null; birthday: string | null; pictureUrl: string | null; isActive: boolean; version: number; createdAt: string; activeTeam: { id: string; name: string } | null };
type ListPlayersParams = { page?: number; pageSize?: 20; search?: string; teamName?: string; position?: string; status?: PlayerStatusFilter; sortBy?: "lastName" | "createdAt"; sortOrder?: "asc" | "desc" };
type CreatePlayerInput = { firstName: string; lastName: string; nationality?: string | null; position?: string | null; birthday?: string | null; pictureUrl?: string | null; teamId?: string; joinedAt?: string; shirtNumber?: number | null };
type UpdatePlayerInput = Partial<Omit<CreatePlayerInput, "teamId" | "joinedAt">> & { isActive?: boolean; version: number };
type PaginatedPlayersResponse = PaginatedResponse<Player>;
export type { CreatePlayerInput, ListPlayersParams, PaginatedPlayersResponse, Player, PlayerStatus, PlayerStatusFilter, UpdatePlayerInput };
