import { PrismaClient } from "@prisma/client";

/**
 * Supabase-optimised Prisma singleton.
 *
 * Why the extra URL params:
 * - connect_timeout=15     → give the pooler 15s to accept a connection
 *   before Prisma gives up (default is 5s which is too short for cold starts)
 * - pool_timeout=10        → wait up to 10s for a free connection from the pool
 * - connection_limit=5     → allow concurrent work within an instance while
 *   using Supavisor transaction pooling to cap database-side connections
 * - pgbouncer=true         → tells Prisma to skip prepared-statement caching
 *   which is required when PgBouncer is in transaction mode; harmless in
 *   session mode but keeps things working if the URL ever switches mode.
 *
 * The singleton pattern (globalForPrisma) prevents creating a new client
 * on every hot-reload during development — without it you'd exhaust the
 * pool in seconds during `npm run dev`.
 */

function buildDatabaseUrl() {
  const base = process.env.DATABASE_URL ?? "";
  if (!base) return base;
  const url = new URL(base);
  if (!url.searchParams.has("connect_timeout"))  url.searchParams.set("connect_timeout",  "15");
  if (!url.searchParams.has("pool_timeout"))     url.searchParams.set("pool_timeout",     "10");
  // Keep this small for serverless scaling. Set PRISMA_CONNECTION_LIMIT only
  // after checking Supavisor capacity and observed pool wait metrics.
  const requestedLimit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? (process.env.VERCEL ? "5" : url.searchParams.get("connection_limit") ?? "5"));
  const connectionLimit = Number.isInteger(requestedLimit) ? Math.min(5, Math.max(1, requestedLimit)) : 5;
  url.searchParams.set("connection_limit", String(connectionLimit));
  if (!url.searchParams.has("pgbouncer"))        url.searchParams.set("pgbouncer",        "true");
  return url.toString();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: { url: buildDatabaseUrl() },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
