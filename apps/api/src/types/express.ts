// Shared Express types and declaration merging belong in this module.
import type { AppRole } from "../auth/appRole";

interface AuthenticatedUser {
  id: string;
  role: AppRole;
}

// Express declaration merging requires a namespace here.
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export type { AuthenticatedUser };
export {};
