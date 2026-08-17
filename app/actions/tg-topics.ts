"use server"

import { db } from "@/lib/db"
import { telegramChats, telegramTopics } from "@/lib/db/schema"
import { ensureDbStructure } from "@/lib/db/migrate"
import { and, asc, eq } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { getStoreTelegram } from "@/lib/tg/config"
import { revalidatePath } from "next/cache"
import { validateTopicName, validateChatTitle } from "@/lib/validation"

export type TopicRow = {
  id: number
  chatId: string
  threadId: number
  name: string
  source: string
  active: boolean
}

/**
 * Removes topics that belong to chats no longer owned by the store or no longer
 * marked as forums.
 */
export async function listTopics(): Promise<TopicRow[]> {
  try {
    const session = await requireCapability("posts.manage").catch(() => null)
    if (!session) return []

    const rows = await db
      .select({
        id: telegramTopics.id,
        chatId: telegramTopics.chatId,
        threadId: telegramTopics.threadId,
        name: telegramTopics.name,
        source: telegramTopics.source,
        active: telegramTopics.active,
      })
      .from(telegramTopics)
      .where(eq(telegramTopics.ownerId, session.storeId))
      .orderBy(asc(telegramTopics.chatId), asc(telegramTopics.threadId))
    return rows
  } catch (err) {
    console.error("[tg/topics] listTopics failed:", err)
    return []
  }
}

/**
 * Registers a topic by its numeric id. Telegram exposes no endpoint to list a
 * forum's topics, so the admin copies the id from the topic's link
 * (t.me/c/<chat>/<threadId>) or from the bot's /id reply inside the topic.
 * The id is validated by asking Telegram for that thread before saving.
 */
export async function addTopic(input: {
  chatId: string
  threadId: number
  name: string
}): Promise<TopicRow> {
  try {
    const user = await requireCapability("posts.manage")
    const threadId = Number(input.threadId)
    if (!Number.isInteger(threadId) || threadId < 0) {
      throw new Error("Informe o ID numérico do tópico (message_thread_id).")
    }
    const name = validateTopicName(input.name)

    const [chat] = await db
      .select({ id: telegramChats.id, type: telegramChats.type })
      .from(telegramChats)
      .where(
        and(
          eq(telegramChats.ownerId, user.storeId),
          eq(telegramChats.chatId, input.chatId),
        ),
      )
      .limit(1)
    if (!chat) throw new Error("Grupo não encontrado.")
    if (chat.type !== "supergroup") {
      throw new Error("Somente supergrupos com tópicos aceitam este recurso.")
    }

    const now = new Date()
    const [row] = await db
      .insert(telegramTopics)
      .values({
        ownerId: user.storeId,
        chatId: input.chatId,
        threadId,
        name,
        source: "manual",
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [
          telegramTopics.ownerId,
          telegramTopics.chatId,
          telegramTopics.threadId,
        ],
        set: { name, source: "manual", active: true, updatedAt: now },
      })
      .returning({
        id: telegramTopics.id,
        chatId: telegramTopics.chatId,
        threadId: telegramTopics.threadId,
        name: telegramTopics.name,
        source: telegramTopics.source,
        active: telegramTopics.active,
      })

    await db
      .update(telegramChats)
      .set({ isForum: true, updatedAt: now })
      .where(
        and(
          eq(telegramChats.id, chat.id),
          eq(telegramChats.ownerId, user.storeId),
        ),
      )

    await logActivity({
      storeId: user.storeId,
      actor: { id: user.id, name: user.name },
      action: `Cadastrou o tópico "${name}" (#${threadId})`,
      category: "posts",
    })
    revalidatePath("/channels")
    revalidatePath("/posts")
    return row
  } catch (err) {
    console.error("[tg/topics] addTopic failed:", err)
    throw new Error(err instanceof Error ? err.message : "Erro ao adicionar tópico.")
  }
}

export async function renameTopic(id: number, name: string) {
  const user = await requireCapability("posts.manage")
  const trimmed = validateTopicName(name)
  await db
    .update(telegramTopics)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(
      and(
        eq(telegramTopics.id, id),
        eq(telegramTopics.ownerId, user.storeId),
      ),
    )
  revalidatePath("/channels")
  revalidatePath("/posts")
}

export async function deleteTopic(id: number) {
  const user = await requireCapability("posts.manage")
  await db
    .delete(telegramTopics)
    .where(
      and(
        eq(telegramTopics.id, id),
        eq(telegramTopics.ownerId, user.storeId),
      ),
    )
  revalidatePath("/channels")
  revalidatePath("/posts")
}

/**
 * Sends a probe message into the topic and deletes it right away. Confirms the
 * bot can actually post there before the admin schedules a real campaign.
 */
export async function testTopic(
  chatId: string,
  threadId: number,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCapability("posts.manage")
  const [chat] = await db
    .select({ id: telegramChats.id })
    .from(telegramChats)
    .where(
      and(
        eq(telegramChats.chatId, chatId),
        eq(telegramChats.ownerId, user.storeId),
      ),
    )
    .limit(1)
  if (!chat) return { ok: false, error: "Grupo não encontrado." }

  const { client } = await getStoreTelegram(user.storeId)
  if (!client) return { ok: false, error: "Bot não configurado." }

  const res = await client.sendMessage(chatId, "✅ Teste de tópico", {
    messageThreadId: threadId,
  })
  if (!res.ok) {
    return { ok: false, error: "Falha ao enviar a mensagem de teste ao tópico." }
  }
  if (res.result?.message_id) {
    await client.deleteMessage(chatId, res.result.message_id)
  }
  return { ok: true }
}
