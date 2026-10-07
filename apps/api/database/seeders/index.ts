import type { Prisma } from "../../src/generated/prisma/client";
import { seedRoles } from "./role.seeder";
import { seedUsers } from "./user.seeder";

const runSeeders = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  await seedRoles(database);
  await seedUsers(database);
};

export { runSeeders };
