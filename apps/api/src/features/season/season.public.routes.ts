import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../middlewares/validateRequest";
import { getPublicMatchdayResponse, getPublicSeasonResponse } from "./season.public.controller";

const publicSeasonRouter = Router();
publicSeasonRouter.get("/seasons/:seasonId", validateRequest({ params: z.object({ seasonId: z.uuid() }).strict(), query: z.object({}).strict() }), getPublicSeasonResponse);
publicSeasonRouter.get("/matchdays/:matchdayId", validateRequest({ params: z.object({ matchdayId: z.uuid() }).strict(), query: z.object({}).strict() }), getPublicMatchdayResponse);
export default publicSeasonRouter;
