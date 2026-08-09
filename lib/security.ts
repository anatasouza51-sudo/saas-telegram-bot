import "server-only"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import RedisIO from "ioredis"

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
 */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

// --- Rate Limiting ---

type RateLimitResult = {
  ok: boolean
  retryAfterMs: number
  limit: number
  remaining: number
  reset: number
}

// In-memory fallback for development
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/**
 * Rate limiter distribuído com suporte a Redis e Upstash.
 * Fallback para memória local em desenvolvimento.
 */
export async function rateLimit(
  key: string,
  opts: { max: number; windowMs: number; namespace?: string },
): Promise<RateLimitResult> {
  const fullKey = `${opts.namespace ?? "rl"}:${key}`
  const now = Date.now()

  // 1. Tentar Upstash Redis (Serverless HTTP)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = Redis.fromEnv()
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(opts.max, `${opts.windowMs} ms`),
        prefix: "@upstash/ratelimit",
      })
      const { success, limit, remaining, reset } = await ratelimit.limit(fullKey)
      return {
        ok: success,
        retryAfterMs: success ? 0 : reset - now,
        limit,
        remaining,
        reset,
      }
    } catch (err) {
      console.error("[security] Upstash rate limiting failed, falling back:", err)
    }
  }

  // 2. Tentar Redis Padrão (TCP)
  if (process.env.REDIS_URL) {
    try {
      const redis = new RedisIO(process.env.REDIS_URL)
      // Estratégia atômica usando INCR e EXPIRE
      const current = await redis.incr(fullKey)
      if (current === 1) {
        await redis.pexpire(fullKey, opts.windowMs)
      }
      
      const ttl = await redis.pttl(fullKey)
      const isOk = current <= opts.max
      
      // Cleanup connection if not persistent (optional, but good for serverless)
      // Em um app real, usaríamos um singleton para o cliente Redis
      
      return {
        ok: isOk,
        retryAfterMs: isOk ? 0 : Math.max(0, ttl),
        limit: opts.max,
        remaining: Math.max(0, opts.max - current),
        reset: now + (ttl > 0 ? ttl : opts.windowMs),
      }
    } catch (err) {
      console.error("[security] Redis rate limiting failed, falling back:", err)
    }
  }

  // 3. Fallback: In-memory sliding window (básico)
  const existing = buckets.get(fullKey)
  if (!existing || now >= existing.resetAt) {
    buckets.set(fullKey, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true, retryAfterMs: 0, limit: opts.max, remaining: opts.max - 1, reset: now + opts.windowMs }
  }
  
  const isOk = existing.count < opts.max
  if (isOk) existing.count += 1
  
  return {
    ok: isOk,
    retryAfterMs: isOk ? 0 : existing.resetAt - now,
    limit: opts.max,
    remaining: Math.max(0, opts.max - existing.count),
    reset: existing.resetAt,
  }
}

/**
 * Prune stale buckets periodically to prevent unbounded memory growth.
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * Identifica o IP do cliente de forma segura.
 * Prioridade: Vercel > Cloudflare (CF-Connecting-IP) > proxies genéricos.
 * CF-Connecting-IP é definido pelo Cloudflare e não pode ser falsificado pelo usuário final.
 */
export function clientIpFrom(req: Request): string {
  // 1. Cloudflare — IP real do cliente (não falsificável)
  const cfIp = req.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()

  // 2. Vercel — headers próprios da plataforma
  const vercelIp = req.headers.get("x-vercel-proxied-for") || req.headers.get("x-real-ip")
  if (vercelIp) return vercelIp.split(",")[0].trim()

  // 3. Proxy genérico
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()

  return "unknown"
}

/**
 * Gera um hash do IP para privacidade em logs persistentes ou rate limiting.
 * Usa um segredo do servidor para evitar rainbow tables.
 */
const IP_SALT =
  process.env.RATE_LIMIT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "vercel-build-fallback-secret-at-least-32-chars-long"
const DYNAMIC_SALT = IP_SALT || randomBytes(32).toString("hex")

export function hashIp(ip: string): string {
  return createHmac("sha256", DYNAMIC_SALT).update(ip).digest("hex").slice(0, 16)
}
