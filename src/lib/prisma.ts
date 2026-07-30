import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

// Explicitly pin the app runtime to the pooled connection string
// (DATABASE_URL) — separate from DIRECT_URL, which the Prisma CLI uses
// for migrations via prisma.config.ts. Prisma 7 requires an explicit
// driver adapter rather than a bare connection string.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
