import {
  assertPeriod,
  overlaps,
  prepareAssignment,
  previousDay,
} from "../../utils/assignmentPeriod";
import type { UpdateStaffAssignmentInput } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type {
  CreateStaffAssignmentInput,
  CreateStaffMemberInput,
  ListStaffMembersParams,
  UpdateStaffMemberInput,
} from "@lucarne/shared";
import { AppError } from "../../errors/AppError";
import { currentAssignmentWhere, plannedAssignmentWhere, assignmentDate } from "./staff.assignment";

const assignmentSelect = {
  id: true,
  jobTitle: true,
  joinedAt: true,
  leftAt: true,
  team: { select: { id: true, name: true } },
} satisfies Prisma.TeamStaffMemberSelect;

const staffMemberListInclude = (date: Date) => ({
  teamStaffMembers: { where: currentAssignmentWhere(date), select: assignmentSelect },
} satisfies Prisma.StaffMemberInclude);

const staffMemberDetailInclude = {
  teamStaffMembers: {
    select: assignmentSelect,
    orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
  },
} satisfies Prisma.StaffMemberInclude;

type StaffMemberRecord = Prisma.StaffMemberGetPayload<{ include: typeof staffMemberDetailInclude }>;

const findStaffMemberById = (id: string) => prisma.staffMember.findUnique({ where: { id }, include: staffMemberDetailInclude });

const listStaffMembers = async (params: ListStaffMembersParams) => {
  const date = assignmentDate();
  const searchTerms = params.search?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.StaffMemberWhereInput = {
    AND: [
      ...(params.search ? [{ OR: [
        { firstName: { contains: params.search, mode: "insensitive" as const } },
        { lastName: { contains: params.search, mode: "insensitive" as const } },
        ...(searchTerms.length > 1 ? [{ AND: [
          { firstName: { contains: searchTerms[0], mode: "insensitive" as const } },
          { lastName: {
            contains: searchTerms.slice(1).join(" "),
            mode: "insensitive" as const,
          } },
        ] }] : []),
      ] }] : []),
      ...(params.status && params.status !== "ALL" ? [{ isActive: params.status === "ACTIVE" }] : []),
      ...(params.teamName ? [{
        ...(params.assignmentStatus === "PLANNED" ? {} : { isActive: true }),
        teamStaffMembers: { some: {
          ...(params.assignmentStatus === "PLANNED" ? plannedAssignmentWhere(date) : currentAssignmentWhere(date)),
          team: { name: { contains: params.teamName, mode: "insensitive" as const } },
        } },
      }] : []),
      ...(params.selectable === true ? [{
        isActive: true,
        teamStaffMembers: { some: currentAssignmentWhere(date) },
      }] : []),
    ],
  };
  const [data, totalItems] = await Promise.all([
    prisma.staffMember.findMany({
      where,
      include: staffMemberListInclude(date),
      orderBy: [{ [params.sortBy ?? "lastName"]: params.sortOrder ?? "asc" }, { id: "asc" }],
      skip: ((params.page ?? 1) - 1) * (params.pageSize ?? 20),
      take: params.pageSize ?? 20,
    }),
    prisma.staffMember.count({ where }),
  ]);
  return { data, totalItems };
};

const assertActiveTeam = async (tx: Prisma.TransactionClient, teamId: string, leftAt?: string | null) => {
  const teams = await tx.$queryRaw<{ is_active: boolean }[]>`
    SELECT is_active FROM team WHERE id = ${teamId}::uuid FOR UPDATE
  `;
  if (!teams[0]) throw new AppError(404, "TEAM_NOT_FOUND", "Équipe introuvable");
  if (!teams[0].is_active && !(leftAt && new Date(leftAt) < assignmentDate()))
    throw new AppError(409, "TEAM_INACTIVE", "L’équipe est inactive");
};

const createStaffMember = (input: CreateStaffMemberInput) => prisma.$transaction(async (tx) => {
  if (input.teamId) await assertActiveTeam(tx, input.teamId, input.leftAt);
  const staffMember = await tx.staffMember.create({ data: {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    nationality: input.nationality.trim(),
    pictureUrl: input.pictureUrl ?? null,
  } });
  if (input.teamId)
    await tx.teamStaffMember.create({ data: {
      staffMemberId: staffMember.id,
      teamId: input.teamId,
      jobTitle: input.jobTitle!.trim(),
      joinedAt: new Date(input.joinedAt!),
      leftAt: input.leftAt ? new Date(input.leftAt) : null,
    } });
  return tx.staffMember.findUniqueOrThrow({ where: { id: staffMember.id }, include: staffMemberDetailInclude });
});

const createStaffAssignment = (staffMemberId: string, input: CreateStaffAssignmentInput) => prisma.$transaction(async (tx) => {
  const joinedAt = new Date(input.joinedAt);
  const leftAt = input.leftAt ? new Date(input.leftAt) : null;
  assertPeriod(joinedAt, leftAt);
  const people = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM staff_member WHERE id = ${staffMemberId}::uuid FOR UPDATE`;
  if (!people[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Personne introuvable");
  const teams = await tx.$queryRaw<{ is_active: boolean }[]>`SELECT is_active FROM team WHERE id = ${input.teamId}::uuid FOR UPDATE`;
  if (!teams[0]) throw new AppError(404, "TEAM_NOT_FOUND", "Équipe introuvable");
  if (!teams[0].is_active && !(leftAt && leftAt < assignmentDate()))
    throw new AppError(409, "TEAM_INACTIVE", "Une équipe inactive ne peut recevoir qu’une affectation historique.");
  const periods = await tx.teamStaffMember.findMany({
    where: { staffMemberId },
    select: { id: true, joinedAt: true, leftAt: true },
  });
  const closure = prepareAssignment(periods, joinedAt, leftAt);
  if (closure)
    await tx.teamStaffMember.update({ where: { id: closure.id }, data: { leftAt: closure.leftAt } });
  await tx.teamStaffMember.create({ data: {
    staffMemberId,
    teamId: input.teamId,
    joinedAt,
    leftAt,
    jobTitle: input.jobTitle.trim(),
  } });
  await tx.staffMember.update({ where: { id: staffMemberId }, data: { version: { increment: 1 } } });
  return tx.staffMember.findUniqueOrThrow({ where: { id: staffMemberId }, include: staffMemberDetailInclude });
});

const updateStaffAssignment = (staffMemberId: string, assignmentId: string, input: UpdateStaffAssignmentInput) => prisma.$transaction(async (tx) => {
  const people = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM staff_member WHERE id = ${staffMemberId}::uuid FOR UPDATE`;
  if (!people[0]) throw new AppError(404, "RESOURCE_NOT_FOUND", "Personne introuvable");
  const periods = await tx.teamStaffMember.findMany({ where: { staffMemberId } });
  const assignment = periods.find((period) => period.id === assignmentId);
  if (!assignment) throw new AppError(404, "RESOURCE_NOT_FOUND", "Affectation introuvable");
  const joinedAt = new Date(input.joinedAt);
  const leftAt = input.leftAt === undefined ? assignment.leftAt : input.leftAt ? new Date(input.leftAt) : null;
  assertPeriod(joinedAt, leftAt);
  if (periods.some((period) => period.id !== assignmentId && overlaps(period, { joinedAt, leftAt })))
    throw new AppError(409, "ASSIGNMENT_PERIOD_CONFLICT", "Cette période chevauche une autre affectation.");
  const teams = await tx.$queryRaw<{ is_active: boolean }[]>`SELECT is_active FROM team WHERE id = ${assignment.teamId}::uuid FOR UPDATE`;
  if (!teams[0]?.is_active && !(leftAt && leftAt < assignmentDate()))
    throw new AppError(409, "TEAM_INACTIVE", "Une équipe inactive ne peut recevoir qu’une affectation historique.");
  await tx.teamStaffMember.update({ where: { id: assignmentId }, data: { joinedAt, leftAt } });
  await tx.staffMember.update({ where: { id: staffMemberId }, data: { version: { increment: 1 } } });
  return tx.staffMember.findUniqueOrThrow({ where: { id: staffMemberId }, include: staffMemberDetailInclude });
});

const closeCurrentAssignment = async (tx: Prisma.TransactionClient, id: string, date: Date) => {
  const periods = await tx.teamStaffMember.findMany({ where: { staffMemberId: id, ...currentAssignmentWhere(date) } });
  const leftAt = previousDay(date);
  for (const period of periods) assertPeriod(period.joinedAt, leftAt);
  return tx.teamStaffMember.updateMany({
    where: { id: { in: periods.map((period) => period.id) } },
    data: { leftAt },
  });
};

const updateStaffMemberOptimistic = (id: string, changes: UpdateStaffMemberInput) => prisma.$transaction(async (tx) => {
  const { version, ...fields } = changes;
  const result = await tx.staffMember.updateManyAndReturn({
    where: { id, version },
    data: { ...fields, version: { increment: 1 } },
  });
  if (!result[0]) return null;
  if (changes.isActive === false) await closeCurrentAssignment(tx, id, assignmentDate());
  return tx.staffMember.findUniqueOrThrow({ where: { id }, include: staffMemberDetailInclude });
});

const deactivateStaffMember = (id: string) => prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM staff_member WHERE id = ${id}::uuid FOR UPDATE`;
  if (!rows[0])
    throw new AppError(404, "RESOURCE_NOT_FOUND", "Membre du staff introuvable");
  const staffMember = await tx.staffMember.findUniqueOrThrow({ where: { id } });
  const closed = await closeCurrentAssignment(tx, id, assignmentDate());
  if (staffMember.isActive || closed.count > 0)
    await tx.staffMember.update({
      where: { id },
      data: { isActive: false, version: { increment: 1 } },
    });
  return tx.staffMember.findUniqueOrThrow({ where: { id }, include: staffMemberDetailInclude });
});

const activateStaffMember = (id: string) => prisma.staffMember.update({
  where: { id },
  data: { isActive: true, version: { increment: 1 } },
  include: staffMemberDetailInclude,
});

const deleteStaffMember = (id: string) => prisma.staffMember.delete({ where: { id } });

const hasProtectedDependencies = (id: string) => prisma.teamStaffMember.count({ where: { staffMemberId: id } });

export {
  updateStaffAssignment,
  activateStaffMember,
  createStaffAssignment,
  createStaffMember,
  deactivateStaffMember,
  deleteStaffMember,
  findStaffMemberById,
  hasProtectedDependencies,
  listStaffMembers,
  updateStaffMemberOptimistic,
};

export type { StaffMemberRecord };
