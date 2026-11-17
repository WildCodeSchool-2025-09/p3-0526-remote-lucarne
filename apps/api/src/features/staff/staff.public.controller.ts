import type { RequestHandler } from "express";
import { publicStaffProfileSchema } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { getPublicStaffService } from "./staff.public.service";

export const getPublicStaffResponse: RequestHandler<{ staffMemberId: string }> = asyncHandler(async (request, response) => {
  const { teamStaffMembers, ...staff } = await getPublicStaffService(request.params.staffMemberId);
  const assignment = teamStaffMembers[0];
  if (!assignment) throw new Error("Missing visible staff assignment");
  response.json(publicStaffProfileSchema.parse({ ...staff, jobTitle: assignment.jobTitle, team: assignment.team }));
});
