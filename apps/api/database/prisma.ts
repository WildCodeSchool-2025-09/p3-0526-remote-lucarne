import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import client from "./client";

const adapter = new PrismaPg(client);
const prisma = new PrismaClient({ adapter });

export default prisma;
