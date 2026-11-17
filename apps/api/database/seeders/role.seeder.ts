import { APP_ROLES } from "../../src/auth/appRole";
import type { Prisma } from "../../src/generated/prisma/client";

const seedRoles = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  for (const roleName of Object.values(APP_ROLES)) {
    await database.role.upsert({
      where: {
        name: roleName,
      },
      update: {},
      create: {
        name: roleName,
      },
    });
  }
};

export { seedRoles };
