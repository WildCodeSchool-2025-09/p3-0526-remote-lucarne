import { Router } from "express";
import authRouter from "./features/auth/auth.routes";
import healthRouter from "./features/health/health.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/health", healthRouter);

export default router;
