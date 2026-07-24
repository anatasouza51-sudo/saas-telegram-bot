import { NextResponse } from "next/server"
import type { TelegramUpdate } from "@/lib/telegram"
import { handleUpdate } from "@/lib/bot"
import { recordWebhookEvent } from "@/lib/tg/discovery"
import { getWebhookSecret } from "@/lib/webhook-secrets"
import { logActivity } from "@/lib/log"
import { safeEqual, rateLimit, clientIpFrom } from "@/lib/security"
import { processSchedules } from "@/lib/tg/scheduler"
import { expireDuePixOrders } from "@/lib/bot"

/**
 * Telegram webhook — authenticated per store.
 *
 * Telegram echoes the secret we set via setWebhook in the
 * `X-Telegram-Bot-Api-Secret-Token` header on every request. We compare it in
 * constant time against the store's stored secret, so forged updates from
 * anyone who merely knows the (non-secret) storeId are rejected and logged.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params
  const ip = clientIpFrom(req)

  const limit = rateLimit(`telegram:${storeId}:${ip}`, {
    max: 120,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }

  const provided = req.headers.get("x-telegram-bot-api-secret-token") ?? ""
  const expected = await getWebhookSecret(storeId, "telegram")

  // Reject if no secret is configured (bot must be (re)connected from the
  // panel, which registers the secret) or if the token doesn't match.
  if (!expected || !safeEqual(provided, expected)) {
    await logActivity({
      storeId,
      action: "Webhook Telegram rejeitado: token ausente/ inválido",
      category: "security",
      details: `ip=${ip}`,
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Record diagnostics before handling so the panel reflects delivery even if
  // handling throws. Diagnostics are best-effort and must not drop the update.
  await recordWebhookEvent(storeId, update)

  let handled = true
  try {
    await handleUpdate(storeId, update)
  } catch (err) {
    handled = false
    // Log server-side only; never leak internals to the caller. The activity
    // log makes the failure visible to the store admin in the panel.
    console.error("[telegram/webhook] update handling failed:", err)
    await logActivity({
      storeId,
      action: "Falha ao processar uma atualização do Telegram",
      category: "system",
      details: err instanceof Error ? err.message : "Erro desconhecido",
    })
  }

  // Opportunistically check for due schedules on every webhook hit.
  // This catches missed firings without needing a per-minute cron.
  try {
    await processSchedules()
  } catch (err) {
    // Best-effort — the cron route will also catch these on the hour.
    console.error("[telegram/webhook] processSchedules failed:", err)
  }

  // BUGFIX: also sweep for expired PIX orders on every webhook hit, so an
  // active bot (any store getting traffic) flips stale payments faster than
  // the once-a-minute cron alone.
  try {
    await expireDuePixOrders()
  } catch (err) {
    // Best-effort — the cron route will also catch these within a minute.
    console.error("[telegram/webhook] expireDuePixOrders failed:", err)
  }

  // Always ack so Telegram doesn't retry indefinitely.
  return NextResponse.json({ ok: true, handled })
}
