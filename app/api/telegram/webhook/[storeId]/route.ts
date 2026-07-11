import { NextResponse } from "next/server"
import type { TelegramUpdate } from "@/lib/telegram"
import { handleUpdate } from "@/lib/bot"
import { verifyWebhookToken } from "@/lib/webhook-security"
import { logActivity } from "@/lib/log"
import { rateLimit, clientIp } from "@/lib/rate-limit"

/**
 * Telegram webhook. Authenticity is enforced via the `secret_token` we set on
 * setWebhook: Telegram echoes it in the `X-Telegram-Bot-Api-Secret-Token`
 * header on every update. We verify it timing-safely, rate limit per IP, and
 * log invalid attempts. Only Telegram (and us) know the per-store token.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params
  const ip = clientIp(req)

  const { allowed } = await rateLimit(`telegram:${ip}`, 120, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 })
  }

  const presented = req.headers.get("x-telegram-bot-api-secret-token")
  if (!verifyWebhookToken("telegram", storeId, presented)) {
    await logActivity({
      storeId,
      action: "Tentativa de webhook Telegram inválida (secret ausente/incorreto)",
      category: "security",
      details: `ip=${ip}`,
    })
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }

  try {
    await handleUpdate(storeId, update)
  } catch (err) {
    // Details only in server logs; never leak to the caller.
    console.log("[v0] telegram webhook error:", err)
  }

  // Always ack so Telegram doesn't retry indefinitely.
  return NextResponse.json({ ok: true })
}
