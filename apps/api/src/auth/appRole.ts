const APP_ROLES = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  EDITOR: "EDITOR",
  USER: "USER",
} as const;

type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

const LEAGUE_VIEW_ROLES: AppRole[] = [
  APP_ROLES.ADMIN,
  APP_ROLES.MODERATOR,
  APP_ROLES.EDITOR,
];
const LEAGUE_DELETE_ROLES: AppRole[] = [APP_ROLES.ADMIN];

const appRoleNames = new Set<string>(Object.values(APP_ROLES));

const isAppRole = (value: string): value is AppRole =>
  appRoleNames.has(value);

export { APP_ROLES, isAppRole, LEAGUE_DELETE_ROLES, LEAGUE_VIEW_ROLES };
export type { AppRole };
