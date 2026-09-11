import { APP_ROLES } from "../../auth/appRole";

const TEAM_CREATE_ROLES = [
  APP_ROLES.ADMIN,
  APP_ROLES.MODERATOR,
  APP_ROLES.EDITOR,
] as const;

export { TEAM_CREATE_ROLES };
