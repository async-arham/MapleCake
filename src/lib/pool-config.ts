import type { PoolConfig } from "pg";

/**
 * Turns a Prisma-style Postgres URL into node-postgres settings.
 * - Supabase's pooler uses its own certificate chain, so for remote hosts we enable TLS
 *   without strict chain verification (traffic is still encrypted).
 * - Prisma-only URL options (pgbouncer, connection_limit...) are removed so `pg` ignores them.
 */
export function buildPoolConfig(connectionString: string, serverless = false): PoolConfig {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");
  for (const key of ["sslmode", "pgbouncer", "connection_limit", "pool_timeout"]) url.searchParams.delete(key);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const useSsl = !isLocal && sslmode !== "disable";
  return {
    connectionString: url.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: serverless ? 1 : 10,
    idleTimeoutMillis: 20_000,
  };
}
