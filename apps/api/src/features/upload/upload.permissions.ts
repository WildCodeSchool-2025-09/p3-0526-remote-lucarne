import { APP_ROLES } from "../../auth/appRole";

const UPLOAD_WRITE_ROLES = [
  APP_ROLES.ADMIN,
  APP_ROLES.MODERATOR,
  APP_ROLES.EDITOR,
] as const;

export { UPLOAD_WRITE_ROLES };