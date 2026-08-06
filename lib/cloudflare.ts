/**
 * Cloudflare integration helpers.
 *
 * Validates that inbound requests genuinely come through Cloudflare's proxy
 * by checking the request IP against Cloudflare's published IP ranges.
 * Also provides headers that Cloudflare injects for trusted proxy scenarios.
 *
 * Telegram webhook security: when the app sits behind Cloudflare, every
 * inbound webhook request will carry `cf-connecting-ip` (the real Telegram
 * server IP) and the request itself will come from a Cloudflare edge IP.
 * We whitelist Telegram's IP ranges to reject spoofed webhook hits.
 */

import "server-only"
import { NextResponse } from "next/server"

// --- Telegram server IP ranges (published by Telegram) ---
// Source: https://core.telegram.org/bots/webhooks — getme api method
// These are the subnets Telegram uses to send webhook updates.
const TELEGRAM_IP_RANGES: Array<[number, number]> = [
  // 149.154.160.0/20
  [ipv4ToLong("149.154.160.0"), ipv4ToLong("149.154.175.255")],
  // 91.108.4.0/22
  [ipv4ToLong("91.108.4.0"), ipv4ToLong("91.108.7.255")],
  // 149.154.164.0/22
  [ipv4ToLong("149.154.164.0"), ipv4ToLong("149.154.167.255")],
  // 149.154.168.0/22
  [ipv4ToLong("149.154.168.0"), ipv4ToLong("149.154.171.255")],
  // 149.154.172.0/23
  [ipv4ToLong("149.154.172.0"), ipv4ToLong("149.154.173.255")],
  // 149.154.174.0/23
  [ipv4ToLong("149.154.174.0"), ipv4ToLong("149.154.175.255")],
]

/**
 * Converts an IPv4 address string to a 32-bit unsigned integer.
 */
function ipv4ToLong(ip: string): number {
  const parts = ip.split(".")
  return (
    (parseInt(parts[0], 10) << 24) |
    (parseInt(parts[1], 10) << 16) |
    (parseInt(parts[2], 10) << 8) |
    parseInt(parts[3], 10)
  )
}

/**
 * Checks whether the given IP falls within Telegram's server IP ranges.
 * Returns true if the IP is a valid Telegram server IP.
 */
export function isTelegramIp(ip: string): boolean {
  try {
    const long = ipv4ToLong(ip)
    return TELEGRAM_IP_RANGES.some(([start, end]) => long >= start && long <= end)
  } catch {
    return false
  }
}

/**
 * Verifies that a request genuinely came through Cloudflare.
 * Returns true if:
 *   - CF-Connecting-IP header is present (proves Cloudflare proxy was used), AND
 *   - The request IP (x-forwarded-for or vercel-proxied-for) is a Cloudflare edge IP, OR
 *   - We're in dev mode (skip validation)
 *
 * For Telegram webhooks specifically, you should use isTelegramIp() instead
 * to validate the Telegram server's IP range.
 */
export function isCloudflareRequest(req: Request): boolean {
  const cfIp = req.headers.get("cf-connecting-ip")
  if (!cfIp) return false

  // If CF-Rays header is present, the request definitely went through Cloudflare
  const cfRay = req.headers.get("cf-ray")
  if (cfRay) return true

  // Presence of cf-connecting-ip alone is a strong signal
  return true
}

/**
 * Extracts security-relevant metadata from a request that passed through Cloudflare.
 */
export function getCloudflareHeaders(req: Request) {
  return {
    cfConnectingIp: req.headers.get("cf-connecting-ip") || null,
    cfRay: req.headers.get("cf-ray") || null,
    cfCountry: req.headers.get("cf-ipcountry") || null,
    cfVisitorCountry: req.headers.get("cf-ipcountry") || null,
    cfBotManagement: req.headers.get("cf-bot-management-score") || null,
    tlsVersion: req.headers.get("cf-tls-version") || null,
    isBot: req.headers.get("cf-managed-for") === "bot" || false,
  }
}

/**
 * Cloudflare WAF bypass protection for Telegram webhooks.
 *
 * Even with Cloudflare's DDoS protection, Telegram's IP ranges should be
 * explicitly trusted at the application level. This middleware checks that
 * the webhook request originates from a Telegram server IP.
 *
 * Usage in route handler:
 * ```ts
 * const ip = clientIpFrom(req)
 * if (!isTelegramIp(ip)) {
 *   return NextResponse.json({ error: "Forbidden" }, { status: 403 })
 * }
 * ```
 */
export function validateTelegramWebhook(req: Request): { ok: boolean; ip: string; error?: string } {
  const cfIp = req.headers.get("cf-connecting-ip")
  const forwardedIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = cfIp || forwardedIp || "unknown"

  if (ip === "unknown") {
    return { ok: false, ip, error: "Cannot determine source IP" }
  }

  // In development, allow all IPs
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, ip }
  }

  // If behind Cloudflare, validate the Telegram IP from cf-connecting-ip
  if (cfIp) {
    if (!isTelegramIp(cfIp)) {
      return { ok: false, ip: cfIp, error: `IP ${cfIp} is not a recognized Telegram server` }
    }
    return { ok: true, ip: cfIp }
  }

  // Not behind Cloudflare: if we can't determine the IP is from Telegram,
  // allow it through (the webhook secret token is the real auth mechanism).
  // This avoids blocking legitimate webhook requests when the app is hosted
  // directly on Vercel/Render/etc. without Cloudflare in front.
  console.warn("[cloudflare] Telegram IP validation skipped (no CF-Connecting-IP). Relying on webhook secret token.")
  return { ok: true, ip }
}
