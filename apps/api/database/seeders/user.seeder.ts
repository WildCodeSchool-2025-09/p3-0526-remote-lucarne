import { APP_ROLES } from "../../src/auth/appRole";
import { hashPassword } from "../../src/auth/password";
import type { Prisma } from "../../src/generated/prisma/client";

// Development credentials; the seed command is disabled in production.
const ADMIN_EMAIL = "admin@lucarne.test";
const ADMIN_PASSWORD = "Lucarne-Admin-2026!";

const seedUsers = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  const existingUser = await database.appUser.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingUser != null) {
    return;
  }

  await database.appUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      firstName: "Lucarne",
      lastName: "Admin",
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      status: "ACTIVE",
      role: { connect: { name: APP_ROLES.ADMIN } },
    },
  });
};

export { seedUsers };
