import { Router } from "express";
import authRouter from "./features/auth/auth.routes";
import healthRouter from "./features/health/health.routes";
import leagueRouter from "./features/league/league.routes";
import teamRouter from "./features/team/team.routes";
import playerRouter from "./features/player/player.routes";
import staffRouter from "./features/staff/staff.routes";
import uploadRouter from "./features/upload/upload.routes";
import seasonRouter, { leagueSeasonRouter } from "./features/season/season.routes";
import participationRouter from "./features/participation/participation.routes";
import bugReportRouter from "./features/bug-report/bug-report.routes";
import adminMatchRouter, { publicMatchRouter } from "./features/match/match.routes";
import { environment } from "./config/environment";

const router = Router();

router.use("/auth", authRouter);
router.use("/health", healthRouter);
router.use("/leagues", leagueRouter);
router.use("/teams", teamRouter);
router.use("/players", playerRouter);
router.use("/staff-members", staffRouter);
router.use("/seasons", seasonRouter);
router.use("/leagues/:leagueId/seasons", leagueSeasonRouter);
router.use(participationRouter);
router.use("/admin/matches", adminMatchRouter);
router.use("/matches", publicMatchRouter);
router.use("/uploads", uploadRouter);

if (environment.nodeEnv === "development") {
  router.use("/bug-reports", bugReportRouter);
}

export default router;
