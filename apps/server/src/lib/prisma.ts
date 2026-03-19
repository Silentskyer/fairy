import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __fairyPrisma__: PrismaClient | undefined;
}

export function getPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!globalThis.__fairyPrisma__) {
    globalThis.__fairyPrisma__ = new PrismaClient();
  }

  return globalThis.__fairyPrisma__;
}
