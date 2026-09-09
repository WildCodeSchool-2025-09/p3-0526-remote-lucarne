import { faker } from "@faker-js/faker";
import type { Prisma } from "../../src/generated/prisma/client";
import { seedLeague } from "./league.seeder";
import { seedPlayers } from "./player.seeder";
import { seedRoles } from "./role.seeder";
import { seedStaff } from "./staff.seeder";
import { seedTeams } from "./team.seeder";

const FAKER_SEED = 21_021;

const runSeeders = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  faker.seed(FAKER_SEED);

  await seedRoles(database);
  await seedLeague(database);
  await seedTeams(database);
  await seedPlayers(database);
  await seedStaff(database);
};

export { runSeeders };
