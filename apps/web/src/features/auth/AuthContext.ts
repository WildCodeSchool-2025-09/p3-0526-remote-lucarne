import { createContext, useContext } from "react";
import type { AppRole } from "../../auth/authRole";

export type AuthMode = "login" | "register";
interface AuthContextValue {
  role: AppRole | null;
  authenticated: boolean;
  checking: boolean;
  sessionError: boolean;
  retrySession: () => void;
  openAuth: (mode: AuthMode, returnFocus?: HTMLElement | null) => void;
  logout: () => void;
}
export const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
