import type { PoolConfig } from "pg";

/**
 * Turns a Prisma-style Postgres URL into node-postgres settings.
 * - Supabase's pooler uses its own certificate chain, so for remote hosts we enable TLS
 *   without strict chain verification (traffic is still encrypted).
 * - Prisma-only URL options (pgbouncer, connection_limit...) are removed so `pg` ignores them.
 * - Few connections, short idle time and keep-alive: Supabase's pooler has a small connection
 *   limit and drops idle connections, so we hand them back early instead of reusing dead ones.
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
    max: serverless ? 1 : isLocal ? 10 : 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  };
}
