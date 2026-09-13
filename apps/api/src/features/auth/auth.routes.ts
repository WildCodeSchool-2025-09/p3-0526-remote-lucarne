import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { login } from "./auth.controller";
import { loginBodySchema } from "./auth.schema";
import { loginRateLimit } from "../../middlewares/loginRateLimit";

const authRouter = Router();

authRouter.post(
  "/login",
  loginRateLimit,
  validateRequest({ body: loginBodySchema }),
  login,
);

export default authRouter;
