export interface AuthResponse {
  accessToken: string;
}

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "EDITOR" | "MODERATOR" | "ADMIN";
}
