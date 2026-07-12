"use server"

import { db } from "@/lib/db"
import { telegramChats } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { getStoreTelegram, TG_KEYS } from "@/lib/tg/config"
import { syncKnownChats } from "@/lib/tg/discovery"
import { saveSetting } from "@/lib/settings"
import { revalidatePath } from "next/cache"

// Keeps the CDN / management setting keys in sync with the chats table so the
// rest of the module (uploads, alerts) can resolve them by a single key.
async function syncPurposeSettings(storeId: string) {
  const rows = await db
    .select()
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))
  const cdn = rows.find((r) => r.purpose === "cdn" && r.status === "active")
  const mgmt = rows.find(
    (r) => r.purpose === "management" && r.status === "active",
  )
  await saveSetting(storeId, TG_KEYS.cdnChatId, cdn?.chatId ?? "")
  await saveSetting(storeId, TG_KEYS.managementChatId, mgmt?.chatId ?? "")
}

// Lists every chat auto-detected for the current store. There is no manual
// registration: rows only exist because the bot was added to those chats.
export async function listChannels() {
  const { storeId } = await requireCapability("posts.manage")
  return db
    .select()
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))
    .orderBy(desc(telegramChats.updatedAt))
}

// "Sincronizar Telegram" button: re-queries every known chat via the Bot API
// and refreshes name, username, admin status, permissions and member count.
// Telegram exposes no endpoint to list all chats, so this revalidates the set
// already discovered through my_chat_member events.
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

// Assigns a special role to an already-detected chat: audience (default),
// private CDN store, or management/alerts group. This is the only per-chat
// setting an admin controls — everything else comes from the Telegram API.
export async function setChatPurpose(
  id: number,
  purpose: "audience" | "cdn" | "management",
) {
  const user = await requireCapability("posts.manage")
  const [chat] = await db
    .select()
    .from(telegramChats)
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )
    .limit(1)
  if (!chat) throw new Error("Grupo/canal não encontrado.")

  // A store can only have one CDN and one management chat: demote any previous
  // holder of the chosen exclusive role back to audience.
  if (purpose === "cdn" || purpose === "management") {
    await db
      .update(telegramChats)
      .set({ purpose: "audience", updatedAt: new Date() })
      .where(
        and(
          eq(telegramChats.ownerId, user.storeId),
          eq(telegramChats.purpose, purpose),
        ),
      )
  }

  await db
    .update(telegramChats)
    .set({ purpose, updatedAt: new Date() })
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )

  await syncPurposeSettings(user.storeId)
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Definiu "${chat.title}" como ${
      purpose === "cdn"
        ? "CDN privado"
        : purpose === "management"
          ? "grupo de gerenciamento"
          : "destino de audiência"
    }`,
    category: "settings",
  })
  revalidatePath("/channels")
}
