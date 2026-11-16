import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { login, register, me } from "./auth.controller";
import { loginBodySchema, registerBodySchema } from "./auth.schema";
import { loginRateLimit } from "../../middlewares/loginRateLimit";
import { registerRateLimit } from "../../middlewares/registerRateLimit";
import { authenticate } from "../../middlewares/authenticate";

const authRouter = Router();

authRouter.post(
  "/login",
  loginRateLimit,
  validateRequest({ body: loginBodySchema }),
  login,
);

authRouter.post("/register", registerRateLimit, validateRequest({ body: registerBodySchema }), register);
authRouter.get("/me", authenticate, me);

export default authRouter;
