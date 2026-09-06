import { Router } from "express";
import healthRouter from "./features/health/health.routes";

const router = Router();

router.use("/health", healthRouter);

export default router;
