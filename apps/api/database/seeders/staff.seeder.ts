import { faker } from "@faker-js/faker";
import type { Prisma } from "../../src/generated/prisma/client";
import { SEED_IDS } from "./ids";

const seedStaff = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  for (const [teamIndex, teamId] of SEED_IDS.teams.entries()) {
    const staffMember = {
      id: SEED_IDS.staffMembers[teamIndex],
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      nationality: faker.location.country(),
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

    // Never reopen or overwrite an existing assignment history when reseeding.
    const assignment = await database.teamStaffMember.findFirst({
      where: { staffMemberId: staffMember.id },
    });
    if (assignment == null) {
      await database.teamStaffMember.create({
        data: {
          id: SEED_IDS.teamStaffMembers[teamIndex],
          staffMemberId: staffMember.id,
          teamId,
          jobTitle: "COACH",
          joinedAt: new Date("2026-09-01T00:00:00.000Z"),
        },
      });
    }
  }
};

export { seedStaff };
