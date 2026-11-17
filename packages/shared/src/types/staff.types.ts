import type { z } from "zod";
import type { assignmentDatesSchema } from "../schemas/assignment.schema";
import type { PaginatedResponse } from "./pagination.types";

type StaffMemberStatus = "ACTIVE" | "INACTIVE";
type StaffMemberStatusFilter = "ALL" | StaffMemberStatus;
type StaffAssignmentState = "HISTORICAL" | "CURRENT" | "PLANNED";
type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  pictureUrl: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  activeTeam: { id: string; name: string } | null;
  isSelectable: boolean;
};
type StaffAssignment = {
  id: string;
  team: { id: string; name: string };
  jobTitle: string;
  joinedAt: string;
  leftAt: string | null;
  state: StaffAssignmentState;
};
type StaffMemberDetail = StaffMember & { assignments: StaffAssignment[] };
type ListStaffMembersParams = {
  page?: number;
  pageSize?: 20;
  search?: string;
  teamName?: string;
  assignmentStatus?: "CURRENT" | "PLANNED";
  selectable?: boolean;
  status?: StaffMemberStatusFilter;
  sortBy?: "lastName" | "createdAt";
  sortOrder?: "asc" | "desc";
};
type CreateStaffMemberInput = {
  firstName: string;
  lastName: string;
  nationality: string;
  pictureUrl?: string | null;
  teamId?: string;
  jobTitle?: string;
  joinedAt?: string;
  leftAt?: string | null;
};
type CreateStaffAssignmentInput = { teamId: string; jobTitle: string; joinedAt: string; leftAt?: string | null };
type UpdateStaffMemberInput = Partial<Omit<CreateStaffMemberInput, "teamId" | "jobTitle" | "joinedAt" | "leftAt">> & { isActive?: boolean; version: number };
type PaginatedStaffMembersResponse = PaginatedResponse<StaffMember>;

type UpdateStaffAssignmentInput = z.infer<typeof assignmentDatesSchema>;
export type {
  UpdateStaffAssignmentInput,
  CreateStaffAssignmentInput,
  CreateStaffMemberInput,
  ListStaffMembersParams,
  PaginatedStaffMembersResponse,
  StaffAssignment,
  StaffAssignmentState,
  StaffMember,
  StaffMemberDetail,
  StaffMemberStatus,
  StaffMemberStatusFilter,
  UpdateStaffMemberInput,
};
