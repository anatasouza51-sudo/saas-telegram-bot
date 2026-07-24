import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { processSchedules } from "@/lib/tg/scheduler"
import { processQueue } from "@/lib/tg/queue"
import { expireDuePixOrders } from "@/lib/bot"
import { safeEqual } from "@/lib/security"

// Vercel Cron hits this every minute. It must run on the Node.js runtime
// (multipart/Buffer usage downstream) and never be statically cached.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Authenticates the caller as Vercel Cron (or an operator holding the secret).
// Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`.
async function isAuthorized(): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const h = await headers()
  const auth = h.get("authorization") ?? ""
  // Constant-time comparison to avoid leaking the secret via response timing.
  return safeEqual(auth, `Bearer ${secret}`)
}

// Runs one cron stage in isolation: a failing stage is reported but never
// prevents the remaining stages from running on this tick.
async function stage<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await fn() }
  } catch (err) {
    console.error(`[tg/cron] stage "${name}" failed:`, err)
    return { error: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

async function run() {
  if (!(await isAuthorized())) {
    // Generic 401 — no detail leaked about why.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Expand any due schedules into queue rows, then drain the queue respecting
  // per-chat rate limits and retry/backoff.
  const schedules = await stage("schedules", processSchedules)
  const queue = await stage("queue", () => processQueue())
  // BUGFIX: proactively flip any PIX order whose admin-configured timer has
  // elapsed to "expired" in the customer's chat (removes the payment
  // buttons), instead of relying on the customer to tap "Verificar" first.
  const pix = await stage("pix-expiry", expireDuePixOrders)

  const errors = Object.entries({
    schedules: schedules.error,
    queue: queue.error,
    pixExpiry: pix.error,
  }).filter((entry): entry is [string, string] => Boolean(entry[1]))

  // Surface partial failures with a 500 so the cron run is flagged as failed
  // by the platform instead of silently reporting success.
  return NextResponse.json(
    {
      ok: errors.length === 0,
      fired: schedules.value?.fired ?? 0,
      scheduleFailures: schedules.value?.failed ?? 0,
      processed: queue.value?.processed ?? 0,
      sent: queue.value?.sent ?? 0,
      failed: queue.value?.failed ?? 0,
      pixExpired: pix.value ?? null,
      errors: Object.fromEntries(errors),
    },
    { status: errors.length === 0 ? 200 : 500 },
  )
}

export async function GET() {
  return run()
}

// Allow manual/POST triggering with the same auth (e.g. operational tooling).
export async function POST() {
  return run()
}
