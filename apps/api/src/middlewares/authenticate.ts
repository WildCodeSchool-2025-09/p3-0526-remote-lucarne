import { verifyAccessToken } from "../auth/jwt";
import { isAppRole } from "../auth/appRole";
import prisma from "../../database/prisma";
import { AppError } from "../errors/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const authenticationError = (): AppError => new AppError(
  401,
  "AUTHENTICATION_REQUIRED",
  "Authentication required",
);

const getBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (authorizationHeader == null) {
    return null;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader);
  return match?.[1] ?? null;
};

/*
 * The JWT establishes identity, while the database check makes account
 * deactivation and role changes effective immediately instead of waiting for
 * the token to expire. Only the current user's id and role are attached to
 * the request.
 */
const authenticate = asyncHandler(async (request, _response, next) => {
  const token = getBearerToken(request.get("authorization"));

  if (token == null) {
    next(authenticationError());
    return;
  }

  let payload;

  try {
    payload = await verifyAccessToken(token);
  } catch {
    next(authenticationError());
    return;
  }

  const user = await prisma.appUser.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      status: true,
      role: {
        select: { name: true },
      },
    },
  });

  if (user == null || user.status !== "ACTIVE" || !isAppRole(user.role.name)) {
    next(authenticationError());
    return;
  }

  request.user = {
    id: user.id,
    role: user.role.name,
  };
  next();
});

export { authenticate };
