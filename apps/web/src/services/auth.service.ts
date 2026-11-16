import { httpClient } from "../lib/httpClient";
import type { AuthResponse, LoginInput, RegisterInput, SessionUser } from "@lucarne/shared";
import {
  assertSessionRevision,
  getSessionRevision,
  setAccessToken,
} from "../lib/authToken";

type LoginCredentials = LoginInput;
type LoginResponse = AuthResponse;

async function authenticate(path: string, credentials: LoginInput | RegisterInput, signal?: AbortSignal): Promise<AuthResponse> {
  const sessionRevision = getSessionRevision();
  const response = await httpClient.post<AuthResponse>(path, {
    json: credentials,
    ...(signal ? { signal } : {}),
  });

  assertSessionRevision(sessionRevision);
  signal?.throwIfAborted();
  setAccessToken(response.accessToken);

  return response;
}

const login = (credentials: LoginInput, signal?: AbortSignal) => authenticate("/auth/login", credentials, signal);
const register = (input: RegisterInput, signal?: AbortSignal) => authenticate("/auth/register", input, signal);
const getSessionUser = () => httpClient.get<SessionUser>("/auth/me");

export { login, register, getSessionUser };
export type { LoginCredentials, LoginResponse };
