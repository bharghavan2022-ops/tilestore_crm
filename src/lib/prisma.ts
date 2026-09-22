import { PrismaClient } from "@prisma/client";
import { isProduction } from "../config/env";

// A single PrismaClient instance is reused across the app (and across
// hot-reloads in dev) so we don't exhaust the Postgres connection pool.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["warn", "error"],
  });

if (!isProduction) {
  global.__prisma = prisma;
}
