import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { login } from "./auth.controller";
import { loginBodySchema } from "./auth.schema";

const authRouter = Router();

authRouter.post(
  "/login",
  validateRequest({ body: loginBodySchema }),
  login,
);

export default authRouter;
