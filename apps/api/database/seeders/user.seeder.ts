import { APP_ROLES } from "../../src/auth/appRole";
import { hashPassword } from "../../src/auth/password";
import type { Prisma } from "../../src/generated/prisma/client";
import { randomBytes } from "node:crypto";

// Development-only account. Its password is supplied by the seed environment.
const ADMIN_EMAIL = "admin@lucarne.test";

const seedUsers = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo users cannot be seeded in production");
  }
  const configuredPassword = process.env.DEMO_ADMIN_PASSWORD;
  const password = configuredPassword ?? (process.env.NODE_ENV === "test"
    ? randomBytes(32).toString("base64url")
    : undefined);
  if (password == null) {
    throw new Error("DEMO_ADMIN_PASSWORD (at least 1 characters) is required to seed demo users");
  }
  const existingUser = await database.appUser.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingUser != null) {
    if (configuredPassword != null && process.env.NODE_ENV !== "test") {
      await database.appUser.update({
        where: { email: ADMIN_EMAIL },
        data: { passwordHash: await hashPassword(password) },
      });
    }
    return;
  }

  await database.appUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      firstName: "Lucarne",
      lastName: "Admin",
      passwordHash: await hashPassword(password),
      status: "ACTIVE",
      role: { connect: { name: APP_ROLES.ADMIN } },
    },
  });
};

export { seedUsers };
