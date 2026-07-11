"use server"

import { db } from "@/lib/db"
import { telegramChats } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { getStoreTelegram } from "@/lib/tg/config"
import { validateChat } from "@/lib/tg/validate"
import { revalidatePath } from "next/cache"

export type ChannelInput = {
  title: string
  chatId: string
  username?: string
  type: "group" | "supergroup" | "channel"
  description?: string
  purpose: "audience" | "cdn" | "management"
}

export async function listChannels() {
  const { storeId } = await requireCapability("posts.manage")
  return db
    .select()
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))
    .orderBy(desc(telegramChats.createdAt))
}

// Creates a chat and immediately validates the bot's admin status against it.
export async function addChannel(input: ChannelInput) {
  const user = await requireCapability("posts.manage")
  const chatId = input.chatId.trim()
  if (!chatId) throw new Error("Chat ID é obrigatório.")

  const { client } = await getStoreTelegram(user.storeId)
  let botIsAdmin = false
  let missing: string[] = []
  let resolvedTitle = input.title.trim()
  let resolvedType = input.type
  let resolvedUsername = input.username?.trim() || null

  if (client) {
    const v = await validateChat(client, chatId)
    botIsAdmin = v.botIsAdmin
    missing = v.missingPermissions
    if (v.title) resolvedTitle = resolvedTitle || v.title
    if (v.type) resolvedType = v.type as ChannelInput["type"]
    if (v.username) resolvedUsername = v.username
  }

  const [row] = await db
    .insert(telegramChats)
    .values({
      ownerId: user.storeId,
      title: resolvedTitle || chatId,
      chatId,
      username: resolvedUsername,
      type: resolvedType,
      description: input.description?.trim() || null,
      purpose: input.purpose,
      botIsAdmin,
      missingPermissions: missing.length ? JSON.stringify(missing) : null,
      status: "active",
      lastSyncedAt: client ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [telegramChats.ownerId, telegramChats.chatId],
      set: {
        title: resolvedTitle || chatId,
        type: resolvedType,
        purpose: input.purpose,
        botIsAdmin,
        missingPermissions: missing.length ? JSON.stringify(missing) : null,
        updatedAt: new Date(),
        lastSyncedAt: client ? new Date() : null,
      },
    })
    .returning()

  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Cadastrou o destino "${row.title}"`,
    category: "settings",
  })
  revalidatePath("/channels")
  return row
}

export async function updateChannel(id: number, input: Partial<ChannelInput>) {
  const user = await requireCapability("posts.manage")
  await db
    .update(telegramChats)
    .set({
      title: input.title?.trim(),
      username: input.username?.trim() || null,
      description: input.description?.trim() || null,
      purpose: input.purpose,
      updatedAt: new Date(),
    })
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )
  revalidatePath("/channels")
}

export async function setChannelStatus(id: number, status: "active" | "inactive") {
  const user = await requireCapability("posts.manage")
  await db
    .update(telegramChats)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )
  revalidatePath("/channels")
}

export async function deleteChannel(id: number) {
  const user = await requireCapability("posts.manage")
  await db
    .delete(telegramChats)
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Removeu um destino do Telegram`,
    category: "settings",
  })
  revalidatePath("/channels")
}

// Re-validates the bot's admin status and refreshes stored metadata.
export async function testChannelConnection(id: number) {
  const user = await requireCapability("posts.manage")
  const [chat] = await db
    .select()
    .from(telegramChats)
    .where(
      and(eq(telegramChats.id, id), eq(telegramChats.ownerId, user.storeId)),
    )
    .limit(1)
  if (!chat) throw new Error("Destino não encontrado.")

  const { client } = await getStoreTelegram(user.storeId)
  if (!client) {
    return { ok: false, reason: "Configure o token do bot em Telegram Bot." }
  }

  const v = await validateChat(client, chat.chatId)
  await db
    .update(telegramChats)
    .set({
      title: v.title || chat.title,
      username: v.username ?? chat.username,
      type: (v.type as ChannelInput["type"]) ?? chat.type,
      botIsAdmin: v.botIsAdmin,
      missingPermissions: v.missingPermissions.length
        ? JSON.stringify(v.missingPermissions)
        : null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(telegramChats.id, id))
  revalidatePath("/channels")
  return {
    ok: v.ok,
    reason: v.reason,
    botIsAdmin: v.botIsAdmin,
    missingPermissions: v.missingPermissions,
  }
}
