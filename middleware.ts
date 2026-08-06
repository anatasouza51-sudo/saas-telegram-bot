/**
 * Next.js Middleware — Cloudflare security layer.
 *
 * Runs on every request before it reaches the route handler.
 * Enforces Cloudflare-origin validation on webhook endpoints.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Telegram server IPv4 ranges (decimal long representation).
 * Source: https://core.telegram.org/bots/webhooks#getme
 * Used to whitelist webhook traffic at the middleware layer.
 */
const TELEGRAM_RANGES: Array<[number, number]> = [
  [0x959CA000, 0x959CAFFF], // 149.154.160.0/20  (but only /20 start)
  [0x5B6C0400, 0x5B6C07FF], // 91.108.4.0/22
  [0x959CA400, 0x959CA7FF], // 149.154.164.0/22
  [0x959CA800, 0x959CABFF], // 149.154.168.0/22
  [0x959CAC00, 0x959CADFF], // 149.154.172.0/23
  [0x959CAE00, 0x959CAFFF], // 149.154.174.0/23
]

function ipToLong(ip: string): number {
  const parts = ip.split(".")
  return (
    (parseInt(parts[0], 10) << 24) |
    (parseInt(parts[1], 10) << 16) |
    (parseInt(parts[2], 10) << 8) |
    parseInt(parts[3], 10)
  )
}

function isTelegramIp(ip: string): boolean {
  try {
    const long = ipToLong(ip)
    return TELEGRAM_RANGES.some(([start, end]) => long >= start && long <= end)
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Only apply strict IP validation to Telegram webhook endpoint
  if (!pathname.startsWith("/api/telegram/webhook/")) {
    return NextResponse.next()
  }

  // Get the real client IP from Cloudflare header
  const cfIp = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()

  if (!cfIp) {
    // No IP information — reject in production
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Forbidden: missing source IP" },
        { status: 403 },
      )
    }
    return NextResponse.next()
  }

  // Validate that the request originates from Telegram servers
  if (process.env.NODE_ENV === "production" && !isTelegramIp(cfIp)) {
    return NextResponse.json(
      { error: "Forbidden: unauthorized source" },
      { status: 403 },
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/telegram/webhook/:path*"],
}
