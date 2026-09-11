import prisma from "../../../database/prisma";
import { isAppRole } from "../../auth/appRole";
import { signAccessToken } from "../../auth/jwt";
import { verifyPassword } from "../../auth/password";
import { AppError } from "../../errors/AppError";
import type { LoginBody } from "./auth.schema";

const invalidCredentialsError = (): AppError => new AppError(
  401,
  "INVALID_CREDENTIALS",
  "Invalid email or password",
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
    throw new AppError(
      403,
      "ACCOUNT_NOT_ACTIVE",
      "User account is not active",
    );
  }

  if (!isAppRole(user.role.name)) {
    throw new AppError(
      403,
      "ACCOUNT_NOT_AUTHORIZED",
      "User account is not authorized",
    );
  }

  return signAccessToken({
    id: user.id,
    role: user.role.name,
  });
};

export { loginUser };
