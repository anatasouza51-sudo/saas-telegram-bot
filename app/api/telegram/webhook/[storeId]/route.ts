import { NextResponse } from "next/server"
import type { TelegramUpdate } from "@/lib/telegram"
import { handleUpdate } from "@/lib/bot"
import { recordWebhookEvent } from "@/lib/tg/discovery"
import { getWebhookSecret } from "@/lib/webhook-secrets"
import { logActivity } from "@/lib/log"
import { safeEqual, rateLimit, clientIpFrom, hashIp } from "@/lib/security"
import { validateTelegramWebhook } from "@/lib/cloudflare"
import { processSchedules } from "@/lib/tg/scheduler"
import { expireDuePixOrders } from "@/lib/bot"
import { ensureDbStructure } from "@/lib/db/migrate"

// BUGFIX: run DB migrations once per cold start so the unique index on
// customers(ownerId, telegramId) — required for the atomic upsert in
// upsertCustomer — is always present before any /start is processed.
// Fire-and-forget: a failure here must never block the webhook response.
ensureDbStructure().catch((err) => {
  console.error("[telegram/webhook] ensureDbStructure failed:", err)
})

/**
 * Telegram webhook — authenticated per store.
 *
 * Telegram echoes the secret we set via setWebhook in the
 * `X-Telegram-Bot-Api-Secret-Token` header on every request. We compare it in
 * constant time against the store's stored secret, so forged updates from
 * anyone who merely knows the (non-secret) storeId are rejected and logged.
 *
 * Cloudflare integration:
 * - IP validation against Telegram's published server ranges.
 * - CF-Connecting-IP used as the canonical source of the client IP.
 * - If behind Cloudflare, `cf-connecting-ip` header carries the real Telegram IP.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const startedAt = Date.now()
  const { storeId } = await params
  const ip = clientIpFrom(req)

  // Cloudflare + Telegram IP validation
  // In production, reject requests that don't come from Telegram servers.
  if (process.env.NODE_ENV === "production") {
    const validation = validateTelegramWebhook(req)
    if (!validation.ok) {
      await logActivity({
        storeId,
        action: "Webhook Telegram rejeitado: IP não pertence ao Telegram",
        category: "security",
        details: `ip=${ip} reason=${validation.error}`,
      })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const limit = await rateLimit(`telegram:${storeId}:${hashIp(ip)}`, {
    max: 120,
    windowMs: 60_000,
    namespace: "webhook",
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

  // Record diagnostics. Fire-and-forget: diagnostics are best-effort and must
  // not block the response. The cron route also records events, so missing a
  // single entry is acceptable.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  recordWebhookEvent(storeId, update).catch((err) => {
    console.error("[telegram/webhook] recordWebhookEvent failed:", err)
  })

  // Process the update (this is the only operation we must await, because
  // Telegram needs the ack to stop retrying).
  const handleStarted = Date.now()
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
  const handleElapsed = Date.now() - handleStarted

  // Opportunistically check for due schedules — fire-and-forget.
  // The cron route will catch anything missed here within a minute.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  processSchedules()
    .then((result) => {
      const elapsed = Date.now() - startedAt
      if (result.fired > 0 || elapsed > 3_000) {
        console.log(
          `[telegram/webhook] post-processing complete: ${result.fired} schedules fired, ${result.failed} failed, total ${Date.now() - startedAt}ms`,
        )
      }
    })
    .catch((err) => {
      console.error("[telegram/webhook] processSchedules failed:", err)
    })

  // Sweep for expired PIX orders — fire-and-forget.
  // The cron route will catch anything missed here within a minute.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  expireDuePixOrders()
    .then((result) => {
      if (result.expired > 0 || (Date.now() - startedAt) > 3_000) {
        console.log(
          `[telegram/webhook] expire sweep: ${result.checked} checked, ${result.expired} expired`,
        )
      }
    })
    .catch((err) => {
      console.error("[telegram/webhook] expireDuePixOrders failed:", err)
    })

  // Always ack immediately so Telegram doesn't retry. Total time logged.
  const totalElapsed = Date.now() - startedAt
  if (totalElapsed > 2_000) {
    console.warn(
      `[telegram/webhook] slow response: ${totalElapsed}ms (handleUpdate: ${handleElapsed}ms)`,
    )
  }
  return NextResponse.json({ ok: true, handled })
}
