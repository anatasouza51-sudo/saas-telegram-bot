"use server"

import { db } from "@/lib/db"
import { telegramChats } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { getStoreTelegram, TG_KEYS } from "@/lib/tg/config"
import {
  syncKnownChats,
  purgeInvalidChats,
  isRealChatType,
  addChatManually,
} from "@/lib/tg/discovery"
import {
  isExclusivePurpose,
  isValidPurpose,
  getPurposeMeta,
  type ChatPurpose,
} from "@/lib/tg/purposes"
import { saveSetting, getSettings } from "@/lib/settings"
import { getAppBaseUrl } from "@/lib/urls"
import { getOrCreateWebhookSecret } from "@/lib/webhook-secrets"
import { revalidatePath } from "next/cache"

// Keeps the CDN / management / backup setting keys in sync with the chats table
// so the rest of the module (uploads, alerts, backups) can resolve them by key.
async function syncPurposeSettings(storeId: string) {
  const rows = await db
    .select()
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))
  const active = (purpose: string) =>
    rows.find((r) => r.purpose === purpose && r.status === "active")
  await saveSetting(storeId, TG_KEYS.cdnChatId, active("cdn")?.chatId ?? "")
  await saveSetting(
    storeId,
    TG_KEYS.managementChatId,
    active("management")?.chatId ?? "",
  )
  await saveSetting(
    storeId,
    TG_KEYS.backupChatId,
    active("backups")?.chatId ?? "",
  )
}

// Lists every chat auto-detected for the current store. There is no manual
// registration: rows only exist because the bot was added to those chats.
// Final safety net: only ever return real groups/supergroups/channels, so a bad
// row (e.g. a private/bot chat) can never surface in the UI.
export async function listChannels() {
  const { storeId } = await requireCapability("posts.manage")
  const rows = await db
    .select()
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))
    .orderBy(desc(telegramChats.updatedAt))
  return rows.filter((r) => isRealChatType(r.type))
}

// "Sincronizar Telegram" button. Two jobs:
//   1. Re-register the webhook (idempotent) so allowed_updates includes
//      my_chat_member/channel_post — this is what makes auto-detection work,
//      and fixes bots whose webhook was set before these updates were enabled.
//   2. Revalidate every known chat: name, username, admin status, permissions
//      and member count. Chats the bot left are marked inactive.
export async function syncAllChannels(): Promise<{
  ok: boolean
  error?: string
  updated?: number
  removed?: number
  total?: number
}> {
  const user = await requireCapability("posts.manage")
  const { client } = await getStoreTelegram(user.storeId)
  if (!client) {
    return { ok: false, error: "Configure o token do bot em Telegram Bot." }
  }

  const me = await client.getMe()
  if (!me.ok || !me.result) {
    return { ok: false, error: "Não foi possível identificar o bot." }
  }

  // Re-register the webhook so *_member and channel_post updates are delivered.
  try {
    const url = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
    const secret = await getOrCreateWebhookSecret(user.storeId, "telegram")
    await client.setWebhook(url, secret)
  } catch {
    // Non-fatal: revalidation of known chats can still proceed.
  }

  const res = await syncKnownChats(user.storeId, me.result.id, client)
  await syncPurposeSettings(user.storeId)

  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Sincronizou grupos e canais do Telegram (${res.updated} ativos, ${res.removed} indisponíveis)`,
    category: "settings",
  })

  revalidatePath("/channels")
  return {
    ok: true,
    updated: res.updated,
    removed: res.removed,
    total: res.total,
  }
}

// "Reiniciar Integração Telegram" button. A full reset that recovers a broken
// integration in one click: validates the token, tears down and re-registers
// the webhook (guaranteeing correct allowed_updates), purges invalid rows (the
// bot itself / private chats), then re-syncs all known chats and settings.
export async function restartTelegramIntegration(): Promise<{
  ok: boolean
  error?: string
  steps?: string[]
  purged?: number
  updated?: number
}> {
  const user = await requireCapability("posts.manage")
  const { client } = await getStoreTelegram(user.storeId)
  if (!client) {
    return { ok: false, error: "Configure o token do bot em Telegram Bot." }
  }

  const steps: string[] = []

  // 1. Validate token.
  const me = await client.getMe()
  if (!me.ok || !me.result) {
    return { ok: false, error: "Token inválido ou API indisponível." }
  }
  steps.push(`Token válido (@${me.result.username ?? "bot"})`)

  // 2. Reset the webhook: delete, then re-create with correct allowed_updates.
  try {
    await client.deleteWebhook(false)
    const url = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
    const secret = await getOrCreateWebhookSecret(user.storeId, "telegram")
    await client.setWebhook(url, secret)
    steps.push("Webhook reiniciado")
  } catch {
    steps.push("Falha ao reiniciar o webhook")
  }

  // 3. Purge invalid rows (bot itself / private chats).
  const purged = await purgeInvalidChats(user.storeId, me.result.id)
  steps.push(`${purged} registro(s) inválido(s) removido(s)`)

  // 4. Re-sync known chats + settings.
  const res = await syncKnownChats(user.storeId, me.result.id, client)
  await syncPurposeSettings(user.storeId)
  steps.push(`${res.updated} grupo(s)/canal(is) sincronizado(s)`)

  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: "Reiniciou a integração do Telegram",
    category: "settings",
  })

  revalidatePath("/channels")
  return { ok: true, steps, purged, updated: res.updated }
}

// Assigns a role to an already-detected chat. The audience/posting role is the
// default; some roles (cdn, management, backups) are exclusive — only one chat
// may hold each at a time. This is the only per-chat setting an admin controls.
export async function setChatPurpose(id: number, purpose: string) {
  const user = await requireCapability("posts.manage")
  if (!isValidPurpose(purpose)) {
    throw new Error("Função inválida.")
  }
  const value = purpose as ChatPurpose

  const [chat] = await db
    .select()
    .from(telegramChats)
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )
    .limit(1)
  if (!chat) throw new Error("Grupo/canal não encontrado.")

  // Exclusive roles: demote any previous holder back to the posting role.
  if (isExclusivePurpose(value)) {
    await db
      .update(telegramChats)
      .set({ purpose: "audience", updatedAt: new Date() })
      .where(
        and(
          eq(telegramChats.ownerId, user.storeId),
          eq(telegramChats.purpose, value),
        ),
      )
  }

  await db
    .update(telegramChats)
    .set({ purpose: value, updatedAt: new Date() })
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )

  await syncPurposeSettings(user.storeId)
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Definiu "${chat.title}" como ${getPurposeMeta(value).label}`,
    category: "settings",
  })
  revalidatePath("/channels")
}

// Manual registration fallback: the admin pastes a Chat ID or @username and we
// verify the bot's presence through the API before saving. Works even when no
// webhook event has fired for an already-joined group.
export async function addChannelManually(
  rawInput: string,
): Promise<{ ok: boolean; error?: string; title?: string }> {
  const user = await requireCapability("posts.manage")
  const { client } = await getStoreTelegram(user.storeId)
  if (!client) {
    return { ok: false, error: "Configure o token do bot em Telegram Bot." }
  }
  const me = await client.getMe()
  if (!me.ok || !me.result) {
    return { ok: false, error: "Token inválido ou API indisponível." }
  }

  const res = await addChatManually(user.storeId, me.result.id, client, rawInput)
  if (!res.ok) return { ok: false, error: res.error }

  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Adicionou manualmente "${res.title}"`,
    category: "settings",
  })
  revalidatePath("/channels")
  return { ok: true, title: res.title }
}

export type TelegramDiagnostics = {
  botConfigured: boolean
  botOk: boolean
  botUsername: string | null
  webhookSet: boolean
  webhookUrl: string | null
  webhookHasMemberUpdates: boolean
  pendingUpdates: number | null
  lastError: string | null
  detectedTotal: number
  activeTotal: number
  groupsTotal: number
  channelsTotal: number
  eventCount: number
  lastEventType: string | null
  lastEventAt: string | null
  lastPayload: string | null
  reasons: string[]
}

// Powers the diagnostics panel. Explains, in plain Portuguese, why groups might
// not be showing up — checking the bot token, webhook registration, and whether
// allowed_updates actually includes the membership events we depend on.
export async function getTelegramDiagnostics(): Promise<TelegramDiagnostics> {
  const user = await requireCapability("posts.manage")
  const rows = (
    await db
      .select()
      .from(telegramChats)
      .where(eq(telegramChats.ownerId, user.storeId))
  ).filter((r) => isRealChatType(r.type))
  const detectedTotal = rows.length
  const activeTotal = rows.filter((r) => r.status === "active").length
  const groupsTotal = rows.filter(
    (r) => r.type === "group" || r.type === "supergroup",
  ).length
  const channelsTotal = rows.filter((r) => r.type === "channel").length

  const events = await getSettings(user.storeId, [
    TG_KEYS.eventCount,
    TG_KEYS.lastEventType,
    TG_KEYS.lastEventAt,
    TG_KEYS.lastPayload,
  ])

  const diag: TelegramDiagnostics = {
    botConfigured: false,
    botOk: false,
    botUsername: null,
    webhookSet: false,
    webhookUrl: null,
    webhookHasMemberUpdates: false,
    pendingUpdates: null,
    lastError: null,
    detectedTotal,
    activeTotal,
    groupsTotal,
    channelsTotal,
    eventCount: Number(events[TG_KEYS.eventCount] || "0"),
    lastEventType: events[TG_KEYS.lastEventType] || null,
    lastEventAt: events[TG_KEYS.lastEventAt] || null,
    lastPayload: events[TG_KEYS.lastPayload] || null,
    reasons: [],
  }

  const { client } = await getStoreTelegram(user.storeId)
  if (!client) {
    diag.reasons.push(
      "O token do bot ainda não foi configurado. Configure em Telegram Bot.",
    )
    return diag
  }
  diag.botConfigured = true

  const me = await client.getMe()
  if (!me.ok || !me.result) {
    diag.reasons.push(
      "Falha na comunicação com a API do Telegram (token inválido ou fora do ar).",
    )
    return diag
  }
  diag.botOk = true
  diag.botUsername = me.result.username ?? null

  const info = await client.getWebhookInfo()
  if (info.ok && info.result) {
    diag.webhookSet = Boolean(info.result.url)
    diag.webhookUrl = info.result.url || null
    diag.pendingUpdates = info.result.pending_update_count ?? 0
    diag.lastError = info.result.last_error_message ?? null
    const allowed = info.result.allowed_updates ?? []
    // Empty allowed_updates means "all types" in the Bot API, which includes
    // my_chat_member; a non-empty list must explicitly contain it.
    diag.webhookHasMemberUpdates =
      allowed.length === 0 || allowed.includes("my_chat_member")
  }

  if (!diag.webhookSet) {
    diag.reasons.push(
      "O webhook não está registrado. Clique em Sincronizar Telegram para ativá-lo.",
    )
  } else if (!diag.webhookHasMemberUpdates) {
    diag.reasons.push(
      "O webhook não recebe eventos de entrada (my_chat_member). Clique em Sincronizar Telegram para corrigir.",
    )
  }
  if (diag.lastError) {
    diag.reasons.push(`Último erro do webhook: ${diag.lastError}`)
  }
  if (detectedTotal === 0) {
    diag.reasons.push(
      "Nenhum grupo detectado ainda. Adicione o bot a um grupo/canal como administrador; ele aparece aqui automaticamente. Grupos onde o bot já estava aparecem após a primeira mensagem ou ao Sincronizar.",
    )
  }

  return diag
}
