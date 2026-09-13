import type { PaginatedResponse } from "./pagination.types";

type PlayerStatus = "ACTIVE" | "INACTIVE";
type PlayerStatusFilter = "ALL" | PlayerStatus;
type Player = { id: string; firstName: string; lastName: string; nationality: string | null; position: string | null; birthday: string | null; pictureUrl: string | null; isActive: boolean; version: number; createdAt: string; activeTeam: { id: string; name: string } | null; isSelectable: boolean };
type PlayerAssignment = { id: string; team: { id: string; name: string }; joinedAt: string; leftAt: string | null; shirtNumber: number | null; state: "HISTORICAL" | "CURRENT" | "PLANNED" };
type PlayerDetail = Player & { assignments: PlayerAssignment[] };
type ListPlayersParams = { page?: number; pageSize?: 20; search?: string; teamName?: string; assignmentStatus?: "CURRENT" | "PLANNED"; selectable?: boolean; position?: string; status?: PlayerStatusFilter; sortBy?: "lastName" | "createdAt"; sortOrder?: "asc" | "desc" };
type CreatePlayerInput = { firstName: string; lastName: string; nationality?: string | null; position?: string | null; birthday?: string | null; pictureUrl?: string | null; teamId?: string; joinedAt?: string; shirtNumber?: number | null };
type UpdatePlayerInput = Partial<Omit<CreatePlayerInput, "teamId" | "joinedAt" | "shirtNumber">> & { isActive?: boolean; version: number };
type PaginatedPlayersResponse = PaginatedResponse<Player>;
export type { CreatePlayerInput, ListPlayersParams, PaginatedPlayersResponse, Player, PlayerAssignment, PlayerDetail, PlayerStatus, PlayerStatusFilter, UpdatePlayerInput };
