import { Router } from "express";
import { publicSearchQuerySchema } from "@lucarne/shared";
import { validateRequest } from "../../middlewares/validateRequest";
import { searchPublicResourcesResponse } from "./search.controller";

const publicSearchRouter = Router();
publicSearchRouter.get("/", validateRequest({ query: publicSearchQuerySchema }), searchPublicResourcesResponse);
export default publicSearchRouter;
