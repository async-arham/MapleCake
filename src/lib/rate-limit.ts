// Small in-memory limiter to slow down password guessing.
// Note: on serverless hosts each instance has its own memory, so this is best-effort.
// For strict limits, put an edge/WAF rule or a shared store (e.g. Redis) in front.

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function resetRateLimit(key: string) {
  hits.delete(key);
}
