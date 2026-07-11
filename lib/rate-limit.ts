import "server-only"
import { pool } from "@/lib/db"

/**
 * Postgres-backed fixed-window rate limiter. Works reliably across serverless
 * instances (unlike in-memory counters, which reset on cold starts). Fails
 * OPEN on database errors so a transient DB issue never blocks legitimate
 * traffic — availability over strictness for this control.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { rows } = await pool.query<{ count: number }>(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + ($2::bigint || ' milliseconds')::interval)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at < now()
                         THEN now() + ($2::bigint || ' milliseconds')::interval
                         ELSE rate_limits.reset_at END
       RETURNING count`,
      [key, windowMs],
    )
    const count = rows[0]?.count ?? 1
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch {
    return { allowed: true, remaining: limit }
  }
}

/** Best-effort client IP from standard proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
