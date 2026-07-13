import "server-only"
import { db } from "@/lib/db"
import { telegramChats } from "@/lib/db/schema"
import {
  TelegramClient,
  type TelegramChatMember,
  type TelegramChatMemberUpdated,
  type TelegramUpdate,
} from "@/lib/telegram"
import { and, eq } from "drizzle-orm"
import {
  requiredPermissionsForType,
  relevantPermissionsForType,
} from "@/lib/tg/permissions"
import { saveSetting, getSetting } from "@/lib/settings"
import { TG_KEYS } from "@/lib/tg/config"

// Identifies the primary event type in an update, for the diagnostics panel.
function updateType(update: TelegramUpdate): string {
  if (update.my_chat_member) return "my_chat_member"
  if (update.chat_member) return "chat_member"
  if (update.channel_post) return "channel_post"
  if (update.message) return "message"
  if (update.callback_query) return "callback_query"
  return "unknown"
}

// Persists lightweight diagnostics for every inbound webhook: the last event
// type, timestamp, a running counter, and a trimmed copy of the raw payload so
// the admin can inspect exactly what Telegram delivered.
export async function recordWebhookEvent(
  storeId: string,
  update: TelegramUpdate,
): Promise<void> {
  try {
    const prev = Number((await getSetting(storeId, TG_KEYS.eventCount)) ?? "0")
    const payload = JSON.stringify(update).slice(0, 4000)
    await Promise.all([
      saveSetting(storeId, TG_KEYS.lastEventAt, new Date().toISOString()),
      saveSetting(storeId, TG_KEYS.lastEventType, updateType(update)),
      saveSetting(storeId, TG_KEYS.lastPayload, payload),
      saveSetting(storeId, TG_KEYS.eventCount, String(prev + 1)),
    ])
  } catch {
    // Diagnostics are best-effort; never block update handling.
  }
}

export type ChatStatus =
  | "online" // bot present, admin, all required permissions
  | "member" // bot present but only a regular member
  | "insufficient" // bot present (admin) but missing required permissions
  | "removed" // bot was kicked/left

// The ONLY chat types allowed in "Grupos & Canais". Everything else — private
// chats, the bot's own chat, users — must never be persisted or listed.
const REAL_CHAT_TYPES = new Set(["group", "supergroup", "channel"])

export function isRealChatType(type: string | undefined | null): boolean {
  return type != null && REAL_CHAT_TYPES.has(type)
}

// A chat row is only valid if it is a real group/channel AND is not the bot's
// own id. `getChat(botId)` returns a valid "private" chat, which is exactly how
// the bot leaked into the list — so we guard on both conditions everywhere.
export function isValidChatRow(
  type: string | undefined | null,
  chatId: string | number,
  botId: number | null,
): boolean {
  if (!isRealChatType(type)) return false
  if (botId != null && String(chatId) === String(botId)) return false
  return true
}

// Derives the list of admin permissions the bot currently HAS from a member
// record, scoped to the permissions that actually apply to the chat type
// (channels expose posting/editing flags; groups do not).
export function grantedPermissions(
  member: TelegramChatMember,
  type?: string | null,
): string[] {
  const relevant = relevantPermissionsForType(type)
  if (member.status === "creator") {
    // Creator implicitly has every relevant permission.
    return [...relevant]
  }
  if (member.status !== "administrator") return []
  return relevant.filter(
    (key) => (member as Record<string, unknown>)[key] === true,
  )
}

// Required permissions the bot is missing (empty when fully set up). Scoped by
// chat type so channel-only flags never count against a group.
export function missingPermissions(
  member: TelegramChatMember,
  type?: string | null,
): string[] {
  const required = requiredPermissionsForType(type)
  if (member.status === "creator") return []
  if (member.status !== "administrator") {
    // Not an admin at all -> everything required is missing.
    return [...required]
  }
  return required.filter(
    (key) => (member as Record<string, unknown>)[key] !== true,
  )
}

// Whether a membership status means the bot is still in the chat.
export function isPresent(status: TelegramChatMember["status"]): boolean {
  return status !== "left" && status !== "kicked"
}

// Computes the panel status badge from a member record.
export function computeStatus(
  member: TelegramChatMember,
  type?: string | null,
): ChatStatus {
  if (!isPresent(member.status)) return "removed"
  const isAdmin =
    member.status === "administrator" || member.status === "creator"
  if (!isAdmin) return "member"
  return missingPermissions(member, type).length > 0 ? "insufficient" : "online"
}

type UpsertInput = {
  storeId: string
  chatId: string
  title: string
  username: string | null
  type: string
  member: TelegramChatMember
  memberCount?: number | null
  botId?: number | null
}

// Inserts or updates a chat row from freshly resolved Telegram data. The
// (ownerId, chatId) unique index guarantees we never create duplicates, so the
// same chat re-detected simply refreshes its data.
async function upsertChat(input: UpsertInput) {
  // Hard guard: never persist private chats, users, or the bot itself. This is
  // the definitive fix for the bot appearing in the groups list.
  if (!isValidChatRow(input.type, input.chatId, input.botId ?? null)) {
    return
  }

  const present = isPresent(input.member.status)
  const isAdmin =
    input.member.status === "administrator" ||
    input.member.status === "creator"
  const missing = missingPermissions(input.member, input.type)
  const granted = grantedPermissions(input.member, input.type)

  const values = {
    ownerId: input.storeId,
    title: input.title,
    chatId: input.chatId,
    username: input.username,
    type: input.type,
    status: present ? ("active" as const) : ("inactive" as const),
    botIsAdmin: isAdmin,
    missingPermissions: JSON.stringify(missing),
    grantedPermissions: JSON.stringify(granted),
    memberCount: input.memberCount ?? null,
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  }

  await db
    .insert(telegramChats)
    .values(values)
    .onConflictDoUpdate({
      target: [telegramChats.ownerId, telegramChats.chatId],
      // Never overwrite `purpose` here — it's set explicitly by the admin.
      set: {
        title: values.title,
        username: values.username,
        type: values.type,
        status: values.status,
        botIsAdmin: values.botIsAdmin,
        missingPermissions: values.missingPermissions,
        grantedPermissions: values.grantedPermissions,
        memberCount: values.memberCount,
        lastSyncedAt: values.lastSyncedAt,
        updatedAt: values.updatedAt,
      },
    })
}

// Handles a my_chat_member update: the bot was added, removed, promoted, or
// demoted somewhere. We persist the new state immediately so the panel reflects
// it without any manual action.
export async function handleMyChatMember(
  storeId: string,
  update: TelegramChatMemberUpdated,
  client: TelegramClient,
): Promise<void> {
  const chat = update.chat
  // Only real groups/supergroups/channels — never private or the bot itself.
  if (!isValidChatRow(chat.type, chat.id, client.botId)) return

  const member = update.new_chat_member
  let memberCount: number | null = null
  // Member count is best-effort: channels and some groups forbid it.
  if (isPresent(member.status)) {
    const countRes = await client.getChatMemberCount(chat.id)
    if (countRes.ok && typeof countRes.result === "number") {
      memberCount = countRes.result
    }
  }

  await upsertChat({
    storeId,
    chatId: String(chat.id),
    title: chat.title ?? chat.username ?? String(chat.id),
    username: chat.username ?? null,
    type: chat.type,
    member,
    memberCount,
    botId: client.botId,
  })
}

// Passive detection: any message or channel_post arriving from a group/channel
// proves the bot is a member there — even if we never received a my_chat_member
// event (e.g. the bot was added before the webhook was configured, or Telegram
// dropped the event). We resolve the bot's current membership and upsert the
// chat. This is the key fix for "the bot is in the group but nothing shows up".
export async function detectChatFromUpdate(
  storeId: string,
  chat: { id: number; type: string; title?: string; username?: string },
  botId: number,
  client: TelegramClient,
): Promise<void> {
  // Only real groups/supergroups/channels — never private or the bot itself.
  if (!isValidChatRow(chat.type, chat.id, botId)) return

  // Avoid redundant work: if we already have this chat and synced it very
  // recently, skip the extra API calls on every single incoming message.
  const existing = await db
    .select({ id: telegramChats.id, lastSyncedAt: telegramChats.lastSyncedAt })
    .from(telegramChats)
    .where(
      and(
        eq(telegramChats.ownerId, storeId),
        eq(telegramChats.chatId, String(chat.id)),
      ),
    )
    .limit(1)

  const recentlySynced =
    existing.length > 0 &&
    existing[0].lastSyncedAt != null &&
    Date.now() - new Date(existing[0].lastSyncedAt).getTime() < 60_000
  if (recentlySynced) return

  const memberRes = await client.getChatMember(chat.id, botId)
  if (!memberRes.ok || !memberRes.result) return
  const member = memberRes.result
  if (!isPresent(member.status)) return

  let memberCount: number | null = null
  const countRes = await client.getChatMemberCount(chat.id)
  if (countRes.ok && typeof countRes.result === "number") {
    memberCount = countRes.result
  }

  await upsertChat({
    storeId,
    chatId: String(chat.id),
    title: chat.title ?? chat.username ?? String(chat.id),
    username: chat.username ?? null,
    type: chat.type,
    member,
    memberCount,
    botId,
  })
}

export type SyncResult = {
  total: number
  updated: number
  removed: number
  errors: number
  purged: number
}

// Deletes any rows that should never have been stored (private chats, the bot
// itself, unknown types). Returns how many were removed. Safe to call anytime.
export async function purgeInvalidChats(
  storeId: string,
  botId: number | null,
): Promise<number> {
  const rows = await db
    .select({
      id: telegramChats.id,
      chatId: telegramChats.chatId,
      type: telegramChats.type,
    })
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))

  let purged = 0
  for (const row of rows) {
    if (!isValidChatRow(row.type, row.chatId, botId)) {
      await db.delete(telegramChats).where(eq(telegramChats.id, row.id))
      purged += 1
    }
  }
  return purged
}

// Revalidates every chat we already know about for a store. Telegram has no
// "list my chats" endpoint, so this refreshes the known set: title, username,
// admin status, permissions and member count. Chats where the bot is gone are
// marked as removed.
export async function syncKnownChats(
  storeId: string,
  botId: number,
  client: TelegramClient,
): Promise<SyncResult> {
  // First, remove any invalid rows (private/bot/unknown) so they never get
  // "revalidated" back into existence by getChat.
  const purged = await purgeInvalidChats(storeId, botId)

  const rows = await db
    .select()
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))

  const result: SyncResult = {
    total: rows.length,
    updated: 0,
    removed: 0,
    errors: 0,
    purged,
  }

  for (const row of rows) {
    try {
      const [chatRes, memberRes] = await Promise.all([
        client.getChat(row.chatId),
        client.getChatMember(row.chatId, botId),
      ])

      // If the chat itself can't be fetched, the bot most likely lost access.
      if (!chatRes.ok || !chatRes.result || !memberRes.ok || !memberRes.result) {
        await db
          .update(telegramChats)
          .set({
            status: "inactive",
            botIsAdmin: false,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(telegramChats.ownerId, storeId),
              eq(telegramChats.chatId, row.chatId),
            ),
          )
        result.removed += 1
        continue
      }

      const info = chatRes.result
      const member = memberRes.result

      // Defensive: if the resolved chat is not a real group/channel (e.g. it's
      // the bot's own private chat), delete it instead of refreshing it.
      if (!isValidChatRow(info.type, row.chatId, botId)) {
        await db.delete(telegramChats).where(eq(telegramChats.id, row.id))
        result.purged += 1
        continue
      }

      let memberCount: number | null = null
      if (isPresent(member.status)) {
        const countRes = await client.getChatMemberCount(row.chatId)
        if (countRes.ok && typeof countRes.result === "number") {
          memberCount = countRes.result
        }
      }

      await upsertChat({
        storeId,
        chatId: row.chatId,
        title: info.title ?? info.username ?? row.chatId,
        username: info.username ?? null,
        type: info.type,
        member,
        memberCount,
        botId,
      })

      if (isPresent(member.status)) result.updated += 1
      else result.removed += 1
    } catch {
      result.errors += 1
    }
  }

  return result
}

export type ManualAddResult =
  | { ok: true; title: string; type: string; isAdmin: boolean }
  | { ok: false; error: string }

// Manually registers a chat by its id or @username. This does NOT trust the
// admin's word — it resolves the chat through the Bot API and verifies the bot
// is actually a member/admin there. This is the definitive way to register a
// group the bot already joined, since Telegram offers no "list my chats" API
// and webhook events only fire on changes.
export async function addChatManually(
  storeId: string,
  botId: number,
  client: TelegramClient,
  rawInput: string,
): Promise<ManualAddResult> {
  const input = rawInput.trim()
  if (!input) return { ok: false, error: "Informe o ID ou @username do chat." }

  // Accept: -1001234567890, 1234567890, @canal, https://t.me/canal, t.me/canal.
  let identifier = input
  const tmeMatch = input.match(/(?:t\.me\/)(@?[\w+]+)/i)
  if (tmeMatch) identifier = tmeMatch[1]
  if (/^[a-zA-Z]/.test(identifier) && !identifier.startsWith("@")) {
    identifier = `@${identifier}`
  }

  const chatRes = await client.getChat(identifier)
  if (!chatRes.ok || !chatRes.result) {
    return {
      ok: false,
      error:
        "Não foi possível acessar esse chat. Verifique o ID/@username e se o bot está no grupo.",
    }
  }

  const info = chatRes.result
  if (!isValidChatRow(info.type, info.id, botId)) {
    return {
      ok: false,
      error:
        "Só é possível adicionar grupos, supergrupos ou canais — nunca chats privados ou o próprio bot.",
    }
  }

  const memberRes = await client.getChatMember(info.id, botId)
  if (!memberRes.ok || !memberRes.result) {
    return {
      ok: false,
      error:
        "O bot não está nesse chat. Adicione o bot ao grupo/canal antes de registrá-lo.",
    }
  }

  const member = memberRes.result
  if (!isPresent(member.status)) {
    return {
      ok: false,
      error:
        "O bot foi removido desse chat. Adicione-o novamente para registrá-lo.",
    }
  }

  let memberCount: number | null = null
  const countRes = await client.getChatMemberCount(info.id)
  if (countRes.ok && typeof countRes.result === "number") {
    memberCount = countRes.result
  }

  await upsertChat({
    storeId,
    chatId: String(info.id),
    title: info.title ?? info.username ?? String(info.id),
    username: info.username ?? null,
    type: info.type,
    member,
    memberCount,
    botId,
  })

  const isAdmin =
    member.status === "administrator" || member.status === "creator"
  return { ok: true, title: info.title ?? String(info.id), type: info.type, isAdmin }
}
