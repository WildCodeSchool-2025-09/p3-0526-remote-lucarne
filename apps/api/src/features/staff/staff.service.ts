import type { AppRole } from "../../auth/appRole";
import { APP_ROLES } from "../../auth/appRole";
import type { CreateStaffAssignmentInput, CreateStaffMemberInput, ListStaffMembersParams, StaffMember, StaffMemberDetail, UpdateStaffMemberInput } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { assignmentState, utcDate } from "./staff.assignment";
import { activateStaffMember, createStaffAssignment, createStaffMember, deactivateStaffMember, deleteStaffMember, findStaffMemberById, hasProtectedDependencies, listStaffMembers, updateStaffMemberOptimistic } from "./staff.repository";
import type { StaffMemberRecord } from "./staff.repository";

const toStaffMemberSummary = (staffMember: StaffMemberRecord, date = utcDate()): StaffMember => {
  const current = staffMember.isActive
    ? staffMember.teamStaffMembers.find((assignment) => assignmentState(assignment, date) === "CURRENT")
    : undefined;
  return {
    id: staffMember.id, firstName: staffMember.firstName, lastName: staffMember.lastName,
    nationality: staffMember.nationality, pictureUrl: staffMember.pictureUrl,
    isActive: staffMember.isActive, version: staffMember.version, createdAt: staffMember.createdAt.toISOString(),
    activeTeam: current?.team ?? null, isSelectable: staffMember.isActive && current != null,
  };
};
const toStaffMemberDetail = (staffMember: StaffMemberRecord): StaffMemberDetail => {
  const date = utcDate();
  return {
    ...toStaffMemberSummary(staffMember, date),
    assignments: staffMember.teamStaffMembers.map((assignment) => ({
      id: assignment.id, team: assignment.team, jobTitle: assignment.jobTitle,
      joinedAt: assignment.joinedAt.toISOString().slice(0, 10),
      leftAt: assignment.leftAt?.toISOString().slice(0, 10) ?? null,
      state: assignmentState(assignment, date),
    })),
  };
};

const createStaffMemberService = async (input: CreateStaffMemberInput) => toStaffMemberDetail(await createStaffMember(input));
const createStaffAssignmentService = async (id: string, input: CreateStaffAssignmentInput) => toStaffMemberDetail(await createStaffAssignment(id, input));
const getStaffMemberService = async (id: string) => {
  const staffMember = await findStaffMemberById(id);
  if (!staffMember) throw new AppError(404, "RESOURCE_NOT_FOUND", "Membre du staff introuvable");
  return toStaffMemberDetail(staffMember);
};
const listStaffMembersService = async (params: ListStaffMembersParams) => {
  const result = await listStaffMembers(params);
  const date = utcDate();
  return { ...result, data: result.data.map((staffMember) => toStaffMemberSummary(staffMember, date)) };
};
const updateStaffMemberService = async (id: string, input: UpdateStaffMemberInput) => {
  const result = await updateStaffMemberOptimistic(id, input);
  if (result) return toStaffMemberDetail(result);
  await getStaffMemberService(id);
  throw new AppError(409, "RESOURCE_VERSION_CONFLICT", "Le membre du staff a été modifié par un autre utilisateur. Rechargez la fiche.");
};
const deactivateStaffMemberService = async (id: string) => toStaffMemberDetail(await deactivateStaffMember(id));
const activateStaffMemberService = async (id: string) => toStaffMemberDetail(await activateStaffMember(id));
const deleteStaffMemberService = async (id: string, role: AppRole) => {
  if (role !== APP_ROLES.ADMIN) throw new AppError(403, "INSUFFICIENT_ROLE", "Seuls les administrateurs peuvent supprimer un membre du staff");
  await getStaffMemberService(id);
  if (await hasProtectedDependencies(id)) throw new AppError(409, "PROTECTED_DEPENDENCIES", "Suppression bloquée : le membre du staff possède des affectations protégées");
  return deleteStaffMember(id);
};

export { activateStaffMemberService, createStaffAssignmentService, createStaffMemberService, deactivateStaffMemberService, deleteStaffMemberService, getStaffMemberService, listStaffMembersService, updateStaffMemberService };
