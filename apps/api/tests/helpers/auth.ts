import { randomUUID } from "node:crypto";
import prisma from "../../database/prisma";
import { APP_ROLES } from "../../src/auth/appRole";
import type { AppRole } from "../../src/auth/appRole";
import { signAccessToken } from "../../src/auth/jwt";
import { hashPassword } from "../../src/auth/password";

interface AuthenticatedTestUser {
  id: string;
  role: AppRole;
  accessToken: string;
}

const createAuthenticatedUser = async (
  role: AppRole,
): Promise<AuthenticatedTestUser> => {
  const databaseRole = await prisma.role.upsert({
    where: { name: role },
    update: {},
    create: { name: role },
  });
  const user = await prisma.appUser.create({
    data: {
      email: `${role.toLowerCase()}-${randomUUID()}@lucarne.test`,
      firstName: "Test",
      lastName: role,
      passwordHash: await hashPassword("test-password"),
      status: "ACTIVE",
      roleId: databaseRole.id,
    },
  });

  return {
    id: user.id,
    role,
    accessToken: await signAccessToken({ id: user.id, role }),
  };
};

const createAdmin = (): Promise<AuthenticatedTestUser> =>
  createAuthenticatedUser(APP_ROLES.ADMIN);

const createModerator = (): Promise<AuthenticatedTestUser> =>
  createAuthenticatedUser(APP_ROLES.MODERATOR);

const createEditor = (): Promise<AuthenticatedTestUser> =>
  createAuthenticatedUser(APP_ROLES.EDITOR);

const createUser = (): Promise<AuthenticatedTestUser> =>
  createAuthenticatedUser(APP_ROLES.USER);

export {
  createAdmin,
  createAuthenticatedUser,
  createEditor,
  createModerator,
  createUser,
};
export type { AuthenticatedTestUser };
