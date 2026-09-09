const APP_ROLES = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  EDITOR: "EDITOR",
  USER: "USER",
} as const;

type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

const appRoleNames = new Set<string>(Object.values(APP_ROLES));

const isAppRole = (value: string): value is AppRole =>
  appRoleNames.has(value);

export { APP_ROLES, isAppRole };
export type { AppRole };
