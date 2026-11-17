import prisma from "../../../database/prisma";
import { APP_ROLES, isAppRole } from "../../auth/appRole";
import { signAccessToken } from "../../auth/jwt";
import { hashPassword, verifyPassword } from "../../auth/password";
import { AppError } from "../../errors/AppError";
import type { LoginBody, RegisterBody } from "./auth.schema";
import { authenticationErrorMessage } from "@lucarne/shared";
import type { SessionUser } from "@lucarne/shared";
import { Prisma } from "../../generated/prisma/client";

const invalidCredentialsError = (): AppError => new AppError(
  401,
  "INVALID_CREDENTIALS",
  authenticationErrorMessage,
);

const loginUser = async (credentials: LoginBody): Promise<string> => {
  const user = await prisma.appUser.findUnique({
    where: {
      email: credentials.email,
    },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (user == null) {
    throw invalidCredentialsError();
  }

  const passwordIsValid = await verifyPassword(
    credentials.password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    throw invalidCredentialsError();
  }

  if (user.status !== "ACTIVE") {
    throw invalidCredentialsError();
  }

  if (!isAppRole(user.role.name)) {
    throw invalidCredentialsError();
  }

  return signAccessToken({
    id: user.id,
    role: user.role.name,
  });
};

const registerUser = async (input: RegisterBody): Promise<string> => {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.$transaction(async (database) => {
      const role = await database.role.findUnique({ where: { name: APP_ROLES.USER }, select: { id: true } });
      if (!role) throw new AppError(503, "AUTHENTICATION_UNAVAILABLE", "Authentification indisponible");
      const user = await database.appUser.create({
        data: { firstName: input.firstName, lastName: input.lastName, email: input.email, passwordHash, roleId: role.id, status: "ACTIVE" },
        select: { id: true },
      });
      return signAccessToken({ id: user.id, role: APP_ROLES.USER });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw invalidCredentialsError();
    throw error;
  }
};

const getSessionUser = async (id: string): Promise<SessionUser> => {
  const user = await prisma.appUser.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, email: true, status: true, role: { select: { name: true } } },
  });
  if (!user || user.status !== "ACTIVE" || !isAppRole(user.role.name)) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentification requise");
  }
  return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role.name };
};

export { loginUser, registerUser, getSessionUser };
