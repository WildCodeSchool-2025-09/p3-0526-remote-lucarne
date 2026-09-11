import { httpClient } from "../lib/httpClient";
import { setAccessToken } from "../lib/authToken";

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
}

async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await httpClient.post<LoginResponse>("/auth/login", {
    json: credentials,
  });

  setAccessToken(response.accessToken);

  return response;
}

export { login };
export type { LoginCredentials, LoginResponse };
