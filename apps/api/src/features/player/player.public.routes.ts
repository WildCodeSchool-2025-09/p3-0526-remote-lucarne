import { Router } from "express";
import { z } from "zod";
import { publicPlayerQuerySchema, publicStatisticsEditionQuerySchema } from "@lucarne/shared";
import { getPublicPlayerStatistics } from "../ranking/ranking.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { getPublicPlayerResponse, listPublicPlayerResponses } from "./player.public.controller";

const publicPlayerRouter = Router();
publicPlayerRouter.get("/", validateRequest({ query: publicPlayerQuerySchema }), listPublicPlayerResponses);
publicPlayerRouter.get("/:playerId", validateRequest({ params: z.object({ playerId: z.uuid() }).strict(), query: z.object({}).strict() }), getPublicPlayerResponse);
publicPlayerRouter.get("/:playerId/statistics", validateRequest({ params: z.object({ playerId: z.uuid() }).strict(), query: publicStatisticsEditionQuerySchema }), getPublicPlayerStatistics);
export default publicPlayerRouter;
