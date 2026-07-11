import "server-only"
import { TelegramClient } from "@/lib/telegram"
import { getSettings } from "@/lib/settings"

export const TG_KEYS = {
  botToken: "telegram.botToken",
  cdnChatId: "telegram.cdnChatId",
  managementChatId: "telegram.managementChatId",
  backupChatId: "telegram.backupChatId",
} as const

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
