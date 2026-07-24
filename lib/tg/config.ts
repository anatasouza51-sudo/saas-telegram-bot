import "server-only"
import { TelegramClient } from "@/lib/telegram"
import { getSettings } from "@/lib/settings"
import { getAppBaseUrl } from "@/lib/urls"
import { getOrCreateWebhookSecret } from "@/lib/webhook-secrets"

export const NO_BOT_TOKEN_ERROR = "Configure o token do bot em Telegram Bot."
export const BOT_UNREACHABLE_ERROR = "Token inválido ou API indisponível."

export const TG_KEYS = {
  botToken: "telegram.botToken",
  cdnChatId: "telegram.cdnChatId",
  managementChatId: "telegram.managementChatId",
  backupChatId: "telegram.backupChatId",
  // Diagnostics: updated on every inbound webhook so the panel can show the
  // last event received, when, and a trimmed copy of the raw payload.
  lastEventAt: "telegram.diag.lastEventAt",
  lastEventType: "telegram.diag.lastEventType",
  lastPayload: "telegram.diag.lastPayload",
  eventCount: "telegram.diag.eventCount",
} as const

/**
 * A bot token has the form `<botId>:<hash>`. The numeric prefix IS the bot's
 * user id, so we can derive it without an extra getMe() API call. Returns null
 * for malformed tokens.
 */
export function botIdFromToken(token: string): number | null {
  const prefix = token.split(":")[0]
  const id = Number(prefix)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Loads a store's Telegram config and a client bound to its bot token.
 * Returns { client: null } when the store hasn't configured a bot yet.
 */
export async function getStoreTelegram(storeId: string) {
  const map = await getSettings(storeId, [
    TG_KEYS.botToken,
    TG_KEYS.cdnChatId,
    TG_KEYS.managementChatId,
    TG_KEYS.backupChatId,
  ])
  const token = map[TG_KEYS.botToken] || ""
  return {
    token,
    client: token ? new TelegramClient(token) : null,
    cdnChatId: map[TG_KEYS.cdnChatId] || "",
    managementChatId: map[TG_KEYS.managementChatId] || "",
    backupChatId: map[TG_KEYS.backupChatId] || "",
  }
}

export type ResolvedStoreBot =
  | { ok: true; client: TelegramClient; botId: number; username: string | null }
  | { ok: false; error: string }

/**
 * Loads a store's bot client and validates the token against getMe(), which is
 * the precondition of every channel/webhook operation. Returns a ready-to-use
 * client plus the bot's own user id, or a user-facing error message.
 */
export async function resolveStoreBot(
  storeId: string,
): Promise<ResolvedStoreBot> {
  const { client } = await getStoreTelegram(storeId)
  if (!client) return { ok: false, error: NO_BOT_TOKEN_ERROR }
  const me = await client.getMe()
  if (!me.ok || !me.result) return { ok: false, error: BOT_UNREACHABLE_ERROR }
  return {
    ok: true,
    client,
    botId: me.result.id,
    username: me.result.username ?? null,
  }
}

/**
 * (Re-)registers this store's Telegram webhook. Idempotent, and always uses
 * the store's own secret token so inbound updates can be authenticated.
 */
export async function registerStoreWebhook(
  storeId: string,
  client: TelegramClient,
) {
  const url = `${getAppBaseUrl()}/api/telegram/webhook/${storeId}`
  const secret = await getOrCreateWebhookSecret(storeId, "telegram")
  return client.setWebhook(url, secret)
}
