import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import type { LoginBody, RegisterBody } from "./auth.schema";
import { loginUser, registerUser, getSessionUser } from "./auth.service";
import type { AuthResponse, SessionUser } from "@lucarne/shared";
import { AppError } from "../../errors/AppError";

const login: RequestHandler<
  Record<string, never>,
  AuthResponse,
  LoginBody
> = asyncHandler(async (request, response) => {
  const accessToken = await loginUser(request.body);

  response.status(200).json({ accessToken });
});

const register: RequestHandler<Record<string, never>, AuthResponse, RegisterBody> = asyncHandler(async (request, response) => {
  const accessToken = await registerUser(request.body);
  response.status(201).json({ accessToken });
});

const me: RequestHandler<Record<string, never>, SessionUser> = asyncHandler(async (request, response) => {
  if (!request.user) throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentification requise");
  response.json(await getSessionUser(request.user.id));
});

export { login, register, me };
