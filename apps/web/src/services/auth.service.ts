import { httpClient } from "../lib/httpClient";
import {
  assertSessionRevision,
  getSessionRevision,
  setAccessToken,
} from "../lib/authToken";

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
}

async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const sessionRevision = getSessionRevision();
  const response = await httpClient.post<LoginResponse>("/auth/login", {
    json: credentials,
  });

  assertSessionRevision(sessionRevision);
  setAccessToken(response.accessToken);

  return response;
}

export { login };
export type { LoginCredentials, LoginResponse };
