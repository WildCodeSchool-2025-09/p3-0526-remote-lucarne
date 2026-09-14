import { Router } from "express";
import { createStaffAssignmentInputSchema, createStaffMemberInputSchema, deleteStaffMemberBodySchema, staffMemberIdParamsSchema, staffMemberListQuerySchema, updateStaffMemberInputSchema } from "@lucarne/shared";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { activateStaffMember, createStaffAssignment, createStaffMember, deactivateStaffMember, deleteStaffMember, getStaffMember, listStaffMembers, updateStaffMember } from "./staff.controller";
import { STAFF_MEMBER_DELETE_ROLES, STAFF_MEMBER_VIEW_ROLES, STAFF_MEMBER_WRITE_ROLES } from "./staff.permissions";

const staffRouter = Router();

staffRouter.get("/", authenticate, requireRoles(...STAFF_MEMBER_VIEW_ROLES), validateRequest({ query: staffMemberListQuerySchema }), listStaffMembers);
staffRouter.get("/:staffMemberId", authenticate, requireRoles(...STAFF_MEMBER_VIEW_ROLES), validateRequest({ params: staffMemberIdParamsSchema }), getStaffMember);
staffRouter.post("/", authenticate, requireRoles(...STAFF_MEMBER_WRITE_ROLES), validateRequest({ body: createStaffMemberInputSchema }), createStaffMember);
staffRouter.post("/:staffMemberId/assignments", authenticate, requireRoles(...STAFF_MEMBER_WRITE_ROLES), validateRequest({ params: staffMemberIdParamsSchema, body: createStaffAssignmentInputSchema }), createStaffAssignment);
staffRouter.patch("/:staffMemberId", authenticate, requireRoles(...STAFF_MEMBER_WRITE_ROLES), validateRequest({ params: staffMemberIdParamsSchema, body: updateStaffMemberInputSchema }), updateStaffMember);
staffRouter.post("/:staffMemberId/deactivate", authenticate, requireRoles(...STAFF_MEMBER_WRITE_ROLES), validateRequest({ params: staffMemberIdParamsSchema }), deactivateStaffMember);
staffRouter.post("/:staffMemberId/activate", authenticate, requireRoles(...STAFF_MEMBER_WRITE_ROLES), validateRequest({ params: staffMemberIdParamsSchema }), activateStaffMember);
staffRouter.delete("/:staffMemberId", authenticate, requireRoles(...STAFF_MEMBER_DELETE_ROLES), validateRequest({ params: staffMemberIdParamsSchema, body: deleteStaffMemberBodySchema }), deleteStaffMember);

export default staffRouter;
