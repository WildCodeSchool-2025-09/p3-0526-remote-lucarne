import { Router } from "express";
import { z } from "zod";
import { publicStatisticsEditionQuerySchema, publicTeamQuerySchema } from "@lucarne/shared";
import { getPublicTeamStatistics } from "../ranking/ranking.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { getPublicTeamResponse, getPublicTeamRosterResponse, listPublicTeamResponses } from "./team.public.controller";

const publicTeamRouter = Router();
const params = z.object({ teamId: z.uuid() }).strict();
const query = z.object({}).strict();
publicTeamRouter.get("/", validateRequest({ query: publicTeamQuerySchema }), listPublicTeamResponses);
publicTeamRouter.get("/:teamId", validateRequest({ params, query }), getPublicTeamResponse);
publicTeamRouter.get("/:teamId/roster", validateRequest({ params, query }), getPublicTeamRosterResponse);
publicTeamRouter.get("/:teamId/statistics", validateRequest({ params, query: publicStatisticsEditionQuerySchema }), getPublicTeamStatistics);
export default publicTeamRouter;
