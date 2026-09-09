import type { RequestHandler } from "express";
import { APP_ROLES } from "../auth/appRole";
import type { AppRole } from "../auth/appRole";
import { AppError } from "../errors/AppError";

const WRITE_ROLES: AppRole[] = [
  APP_ROLES.ADMIN,
  APP_ROLES.MODERATOR,
  APP_ROLES.EDITOR,
];
const DELETE_ROLES: AppRole[] = [APP_ROLES.ADMIN, APP_ROLES.MODERATOR];

const requireRoles = (...allowedRoles: AppRole[]): RequestHandler => (
  request,
  _response,
  next,
) => {
  if (request.user == null) {
    next(new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication required",
    ));
    return;
  }

  if (!allowedRoles.includes(request.user.role)) {
    next(new AppError(
      403,
      "INSUFFICIENT_ROLE",
      "User role is not authorized for this resource",
    ));
    return;
  }

  next();
};

export { DELETE_ROLES, requireRoles, WRITE_ROLES };
