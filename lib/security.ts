import "server-only"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { isIP } from "node:net"
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
const FAIL_CLOSED_RATE_LIMIT_NAMESPACES = new Set(["webhook", "repair", "honeypot", "paystatus", "payment"])
const DEVELOPMENT_SALT = randomBytes(32).toString("hex")

/**
 * Rate limiter distribuído com suporte a Redis e Upstash.
 * Fallback para memória local em desenvolvimento.
 */
export async function rateLimit(
  key: string,
  opts: { max: number; windowMs: number; namespace?: string },
): Promise<RateLimitResult> {
  const namespace = opts.namespace ?? "rl"
  const fullKey = `${namespace}:${key}`
  const now = Date.now()
  const failClosed = process.env.NODE_ENV === "production" && FAIL_CLOSED_RATE_LIMIT_NAMESPACES.has(namespace)
  let distributedAvailable = false

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
      distributedAvailable = true
      return {
        ok: success,
        retryAfterMs: success ? 0 : reset - now,
        limit,
        remaining,
        reset,
      }
    } catch {
      console.error("[security] Upstash rate limiting failed")
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
      
      distributedAvailable = true
      return {
        ok: isOk,
        retryAfterMs: isOk ? 0 : Math.max(0, ttl),
        limit: opts.max,
        remaining: Math.max(0, opts.max - current),
        reset: now + (ttl > 0 ? ttl : opts.windowMs),
      }
    } catch {
      console.error("[security] Redis rate limiting failed")
    }
  }

  if (failClosed && !distributedAvailable) {
    return {
      ok: false,
      retryAfterMs: 5_000,
      limit: 0,
      remaining: 0,
      reset: now + 5_000,
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
  const trustedProxy = process.env.TRUSTED_PROXY

  if (trustedProxy === "cloudflare") {
    const cfIp = req.headers.get("cf-connecting-ip")?.trim() ?? ""
    if (isIP(cfIp)) return cfIp
  }

  if (trustedProxy === "vercel") {
    const vercelIp = (req.headers.get("x-vercel-proxied-for") || req.headers.get("x-real-ip") || "")
      .split(",")[0]
      .trim()
    if (isIP(vercelIp)) return vercelIp
  }

  // Headers genéricos são aceitos apenas fora de produção, onde o proxy é
  // explicitamente configurado pelo operador. Em produção, um header enviado
  // pelo cliente não pode definir a identidade usada pelo rate limiter.
  if (process.env.NODE_ENV !== "production") {
    const forwarded = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    if (isIP(forwarded)) return forwarded
  }

  return "unknown"
}

/**
 * Gera um hash do IP para privacidade em logs persistentes ou rate limiting.
 * Usa um segredo do servidor para evitar rainbow tables.
 */
const IP_SALT = process.env.RATE_LIMIT_SECRET
if (!IP_SALT && process.env.NODE_ENV === "production") {
  throw new Error("[security] RATE_LIMIT_SECRET must be configured in production")
}
const DYNAMIC_SALT = IP_SALT ?? DEVELOPMENT_SALT

export function hashIp(ip: string): string {
  return createHmac("sha256", DYNAMIC_SALT).update(ip).digest("hex").slice(0, 16)
}

// --- CSRF Protection ---

/**
 * Trusted origin hosts for CSRF protection on mutating API routes.
 * Prevents cross-site POST/PUT/PATCH/DELETE from malicious origins.
 */
const TRUSTED_ORIGIN_HOSTS = new Set<string>([
  // Domínio oficial de produção do painel
  "ghostsbot.vercel.app",
  // Ambientes de desenvolvimento locais
  "localhost",
  "127.0.0.1",
])

/**
 * Check if the Origin header is from a trusted source.
 * Returns true for same-origin (null/absent) or trusted domains.
 */
export function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return true // Same-origin request (no Origin header)
  try {
    const url = new URL(origin)
    const host = url.host
    // Exact match against known hosts
    if (TRUSTED_ORIGIN_HOSTS.has(host)) return true
    // Vercel wildcard subdomains (*.vercel.app, *.vusercontent.net)
    if (host.endsWith(".vercel.app") || host.endsWith(".vusercontent.net")) return true
    return false
  } catch {
    return false // Malformed Origin — reject
  }
}

/**
 * CSRF guard for mutating API routes (POST/PUT/PATCH/DELETE).
 * Returns a 403 Response if Origin is untrusted, or null if OK.
 * Usage: const guard = csrfGuard(req); if (guard) return guard;
 */
export function csrfGuard(req: Request): Response | null {
  const origin = req.headers.get("origin")
  if (!isTrustedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }
  return null
}
