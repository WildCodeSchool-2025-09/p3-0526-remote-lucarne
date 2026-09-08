import { faker } from "@faker-js/faker";
import type { Prisma } from "../../src/generated/prisma/client";
import { SEED_IDS } from "./ids";

const seedStaff = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  for (const [teamIndex, teamId] of SEED_IDS.teams.entries()) {
    const staffMember = {
      id: SEED_IDS.staffMembers[teamIndex],
      teamId,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      nationality: faker.location.country(),
      jobTitle: "COACH",
      pictureUrl: faker.image.avatar(),
      isActive: true,
    };

    await database.staffMember.upsert({
      where: {
        id: staffMember.id,
      },
      update: staffMember,
      create: staffMember,
    });
  }
};

export { seedStaff };
