import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { processSchedules } from "@/lib/tg/scheduler"
import { processQueue } from "@/lib/tg/queue"

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
  const auth = h.get("authorization")
  return auth === `Bearer ${secret}`
}

async function run() {
  if (!(await isAuthorized())) {
    // Generic 401 — no detail leaked about why.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Expand any due schedules into queue rows, then drain the queue respecting
  // per-chat rate limits and retry/backoff.
  const { fired } = await processSchedules()
  const result = await processQueue()
  return NextResponse.json({ ok: true, fired, ...result })
}

export async function GET() {
  return run()
}

// Allow manual/POST triggering with the same auth (e.g. operational tooling).
export async function POST() {
  return run()
}
