import type { PaginatedResponse } from "./pagination.types";

type Team = {
  id: string;
  name: string;
  logoUrl: string | null;
  stadium: string | null;
  isActive: boolean;
  createdAt: string;
};

type TeamDeletionDependencies = {
  participations: number;
  playerAssignments: number;
  staffAssignments: number;
  homeMatches: number;
  awayMatches: number;
};

type TeamDeletionPreview = {
  dependencies: TeamDeletionDependencies;
  canDelete: boolean;
};

type TeamStatus = "ACTIVE" | "INACTIVE";
type TeamStatusFilter = "ALL" | TeamStatus;
type TeamSortField = "name" | "createdAt";
type ListTeamsParams = { page?: number; pageSize?: 20; search?: string; status?: TeamStatusFilter; sortBy?: TeamSortField; sortOrder?: "asc" | "desc" };
type UpdateTeamInput = { name?: string; logoUrl?: string | null; stadium?: string | null; isActive?: boolean };
type DeleteTeamInput = { confirm: true };
type PaginatedTeamsResponse = PaginatedResponse<Team>;

type CreateTeamInput = {
  name: string;
  logoUrl?: string | null;
  stadium?: string | null;
};

export type { CreateTeamInput, DeleteTeamInput, ListTeamsParams, PaginatedTeamsResponse, Team, TeamDeletionDependencies, TeamDeletionPreview, TeamSortField, TeamStatus, TeamStatusFilter, UpdateTeamInput };
