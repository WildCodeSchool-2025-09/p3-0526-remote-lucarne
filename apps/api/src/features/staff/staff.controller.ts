import type { RequestHandler } from "express";
import type { CreateStaffAssignmentInput, CreateStaffMemberInput, ListStaffMembersParams, PaginatedStaffMembersResponse, StaffMemberDetail, UpdateStaffMemberInput } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { activateStaffMemberService, createStaffAssignmentService, createStaffMemberService, deactivateStaffMemberService, deleteStaffMemberService, getStaffMemberService, listStaffMembersService, updateStaffMemberService } from "./staff.service";

const createStaffMember: RequestHandler<Record<string, never>, StaffMemberDetail, CreateStaffMemberInput> = asyncHandler(async (request, response) => {
  response.status(201).json(await createStaffMemberService(request.body));
});
const createStaffAssignment: RequestHandler<{ staffMemberId: string }, StaffMemberDetail, CreateStaffAssignmentInput> = asyncHandler(async (request, response) => {
  response.status(201).json(await createStaffAssignmentService(request.params.staffMemberId, request.body));
});
const listStaffMembers: RequestHandler<Record<string, never>, PaginatedStaffMembersResponse, never, ListStaffMembersParams> = asyncHandler(async (request, response) => {
  const result = await listStaffMembersService(request.query);
  const page = request.query.page ?? 1;
  const pageSize = request.query.pageSize ?? 20;
  response.json({ data: result.data, pagination: { page, pageSize, totalItems: result.totalItems, totalPages: Math.ceil(result.totalItems / pageSize) } });
});
const getStaffMember: RequestHandler<{ staffMemberId: string }, StaffMemberDetail> = asyncHandler(async (request, response) => {
  response.json(await getStaffMemberService(request.params.staffMemberId));
});
const updateStaffMember: RequestHandler<{ staffMemberId: string }, StaffMemberDetail, UpdateStaffMemberInput> = asyncHandler(async (request, response) => {
  response.json(await updateStaffMemberService(request.params.staffMemberId, request.body));
});
const deactivateStaffMember: RequestHandler<{ staffMemberId: string }, StaffMemberDetail> = asyncHandler(async (request, response) => {
  response.json(await deactivateStaffMemberService(request.params.staffMemberId));
});
const activateStaffMember: RequestHandler<{ staffMemberId: string }, StaffMemberDetail> = asyncHandler(async (request, response) => {
  response.json(await activateStaffMemberService(request.params.staffMemberId));
});
const deleteStaffMember: RequestHandler<{ staffMemberId: string }> = asyncHandler(async (request, response) => {
  await deleteStaffMemberService(request.params.staffMemberId, request.user!.role);
  response.status(204).send();
});

export { activateStaffMember, createStaffAssignment, createStaffMember, deactivateStaffMember, deleteStaffMember, getStaffMember, listStaffMembers, updateStaffMember };
