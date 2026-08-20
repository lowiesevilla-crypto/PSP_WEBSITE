import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  pspPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.pspPrisma ??
  new PrismaClient({
    log:
      process.env.APP_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pspPrisma = prisma;
}
