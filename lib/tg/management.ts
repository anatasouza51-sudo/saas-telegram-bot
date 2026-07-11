import "server-only"
import { getStoreTelegram } from "@/lib/tg/config"
import { escapeHtml } from "@/lib/security"

type AlertLevel = "info" | "success" | "warning" | "error"

const ICON: Record<AlertLevel, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "🚨",
}

/**
 * Mirrors an operational event into the store's private management group.
 * Best-effort: never throws and never blocks the main flow. When no management
 * group is configured it silently no-ops.
 */
export async function notifyManagement(
  storeId: string,
  level: AlertLevel,
  title: string,
  details?: string,
): Promise<void> {
  try {
    const { client, managementChatId } = await getStoreTelegram(storeId)
    if (!client || !managementChatId) return
    const lines = [
      `${ICON[level]} <b>${escapeHtml(title)}</b>`,
      details ? `\n${escapeHtml(details)}` : "",
      `\n<i>${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</i>`,
    ].filter(Boolean)
    await client.sendMessage(managementChatId, lines.join("\n"))
  } catch (err) {
    console.log("[v0] notifyManagement error:", (err as Error).message)
  }
}
