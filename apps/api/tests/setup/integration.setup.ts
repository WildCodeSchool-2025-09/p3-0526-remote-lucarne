import client from "../../database/client";
import prisma from "../../database/prisma";
import { cleanTestDatabase } from "../helpers/cleanTestDatabase";
import { afterAll, beforeEach } from "vitest";

beforeEach(async () => {
  await cleanTestDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await client.end();
});
