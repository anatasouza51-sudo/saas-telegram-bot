"use server"

import { requireCapability } from "@/lib/session"
import { TelegramClient } from "@/lib/telegram"
import { getSetting } from "@/lib/settings"
import { getAppBaseUrl } from "@/lib/urls"

/**
 * Verifies, from the server, whether this store's Telegram webhook is actually
 * registered at Telegram pointing to THIS store's URL.
 *
 * This is the safeguard against the silent failure mode where Telegram keeps an
 * old webhook registration (for another store, or another URL entirely) and
 * the shop simply never receives /start or button clicks. The panel calls this
 * when the Telegram settings page loads so the admin is warned — and can fix
 * it with one click — instead of discovering the problem when customers report
 * an unresponsive bot.
 */
export async function checkWebhookRegistration(): Promise<{
  ok: boolean
  // true when Telegram's registered URL matches this store's expected URL
  matches?: boolean
  // The URL Telegram currently has registered (for display/debug), undefined when unavailable
  registeredUrl?: string
  error?: string
}> {
  const user = await requireCapability("telegram.manage")
  const token = await getSetting(user.storeId, "telegram.botToken")
  if (!token) {
    return { ok: false, error: "Token do bot não configurado." }
  }
  const expected = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
  const client = new TelegramClient(token)
  const info = await client.getWebhookInfo()
  if (!info.ok || !info.result) {
    return {
      ok: false,
      error:
        info.description ??
        "Não foi possível consultar o status do webhook no Telegram.",
    }
  }
  const registered = info.result.url ?? ""
  return {
    ok: true,
    // Case-insensitive comparison: Telegram may normalize the scheme/host, and
    // the route itself is the canonical identity check.
    matches: registered.toLowerCase() === expected.toLowerCase(),
    registeredUrl: registered,
  }
}
