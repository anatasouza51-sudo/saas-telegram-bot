import "server-only"
import { createHmac, randomBytes, timingSafeEqual } from "crypto"

/**
 * Security primitives shared across webhooks, auth and the bot.
 * Everything here is server-only and never reaches the client bundle.
 */

/** Generates a URL-safe, unguessable secret (default 32 bytes ~ 43 chars). */
export function generateSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

/**
 * Constant-time string comparison. Prevents timing attacks when validating
 * secrets/tokens. Returns false for length mismatch without leaking timing.
 */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Compare against itself to keep timing roughly constant, then fail.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/** HMAC-SHA256 hex digest, used to verify signed webhook payloads. */
export function hmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

/**
 * Escapes text for safe interpolation into Telegram HTML messages.
 * Prevents broken markup / HTML injection from product names, descriptions,
 * customer-provided content, etc.
 */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * Note: state lives in the process, so in a multi-instance/serverless
 * deployment each instance keeps its own counters. It still meaningfully
 * blunts brute-force/spam bursts. For strict distributed limits, back this
 * with Upstash Redis — the call sites won't change.
 */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true, retryAfterMs: 0 }
  }
  if (existing.count >= opts.max) {
    return { ok: false, retryAfterMs: existing.resetAt - now }
  }
  existing.count += 1
  return { ok: true, retryAfterMs: 0 }
}

/** Extracts a best-effort client IP from request headers. */
export function clientIpFrom(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
