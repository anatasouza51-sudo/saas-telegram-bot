import "server-only"
import { TelegramClient } from "@/lib/telegram"
import { getSettings } from "@/lib/settings"

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
