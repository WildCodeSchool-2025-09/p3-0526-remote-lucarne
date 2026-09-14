import type { CreateStaffAssignmentInput, CreateStaffMemberInput, ListStaffMembersParams, PaginatedStaffMembersResponse, StaffMemberDetail, UpdateStaffMemberInput } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

const createStaffMember = (input: CreateStaffMemberInput) => httpClient.post<StaffMemberDetail>("/staff-members", { json: input });
const listStaffMembers = (params: ListStaffMembersParams) => httpClient.get<PaginatedStaffMembersResponse>("/staff-members", { query: params });
const getStaffMember = (id: string) => httpClient.get<StaffMemberDetail>(`/staff-members/${id}`);
const createStaffAssignment = (id: string, input: CreateStaffAssignmentInput) => httpClient.post<StaffMemberDetail>(`/staff-members/${id}/assignments`, { json: input });
const updateStaffMember = (id: string, input: UpdateStaffMemberInput) => httpClient.patch<StaffMemberDetail>(`/staff-members/${id}`, { json: input });
const activateStaffMember = (id: string) => httpClient.post<StaffMemberDetail>(`/staff-members/${id}/activate`);
const deactivateStaffMember = (id: string) => httpClient.post<StaffMemberDetail>(`/staff-members/${id}/deactivate`);
const deleteStaffMember = (id: string) => httpClient.delete<void>(`/staff-members/${id}`, { json: { confirm: true } });

export { activateStaffMember, createStaffAssignment, createStaffMember, deactivateStaffMember, deleteStaffMember, getStaffMember, listStaffMembers, updateStaffMember };
