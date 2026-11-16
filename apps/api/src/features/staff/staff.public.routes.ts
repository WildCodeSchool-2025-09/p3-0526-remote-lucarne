import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../middlewares/validateRequest";
import { getPublicStaffResponse } from "./staff.public.controller";

const publicStaffRouter = Router();
publicStaffRouter.get("/:staffMemberId", validateRequest({ params: z.object({ staffMemberId: z.uuid() }).strict(), query: z.object({}).strict() }), getPublicStaffResponse);
export default publicStaffRouter;
