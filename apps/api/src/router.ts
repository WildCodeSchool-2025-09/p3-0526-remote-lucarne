import { Router } from "express";
import authRouter from "./features/auth/auth.routes";
import healthRouter from "./features/health/health.routes";
import leagueRouter from "./features/league/league.routes";
import teamRouter from "./features/team/team.routes";
import playerRouter from "./features/player/player.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/health", healthRouter);
router.use("/leagues", leagueRouter);
router.use("/teams", teamRouter);
router.use("/players", playerRouter);

export default router;
