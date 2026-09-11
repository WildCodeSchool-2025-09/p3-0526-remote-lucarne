import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import type { LoginBody } from "./auth.schema";
import { loginUser } from "./auth.service";

interface LoginResponse {
  accessToken: string;
}

const login: RequestHandler<
  Record<string, never>,
  LoginResponse,
  LoginBody
> = asyncHandler(async (request, response) => {
  const accessToken = await loginUser(request.body);

  response.status(200).json({ accessToken });
});

export { login };
