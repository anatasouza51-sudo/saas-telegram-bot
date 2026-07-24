import "server-only"
import { db } from "@/lib/db"
import { telegramChats, telegramTopics } from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"

/**
 * A post destination: a chat, optionally narrowed to one of its forum topics.
 * Serialized as "<chatId>" or "<chatId>:<threadId>" so the whole feature rides
 * on the existing string[] target spec (posts, schedules and automations).
 */
export type Destination = {
  chatId: string
  threadId: number | null
}

export function formatTarget(chatId: string, threadId?: number | null): string {
  return threadId ? `${chatId}:${threadId}` : chatId
}

export function parseTarget(token: string): Destination {
  const sep = token.lastIndexOf(":")
  if (sep <= 0) return { chatId: token, threadId: null }
  const threadId = Number(token.slice(sep + 1))
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return { chatId: token, threadId: null }
  }
  return { chatId: token.slice(0, sep), threadId }
}

// Telegram's "General" topic always carries thread id 1 and is where messages
// without a message_thread_id land.
export const GENERAL_THREAD_ID = 1

export async function listTopicsForStore(storeId: string) {
  return db
    .select()
    .from(telegramTopics)
    .where(eq(telegramTopics.ownerId, storeId))
    .orderBy(asc(telegramTopics.chatId), asc(telegramTopics.threadId))
}

/**
 * Records a topic seen in a webhook update. Only supergroups have topics, and
 * only chats we already track are considered, so random threads never create
 * orphan rows. Auto-detected names are refreshed, manual names are preserved.
 */
export async function recordTopicFromUpdate(params: {
  storeId: string
  chatId: string
  threadId: number
  name?: string | null
}): Promise<void> {
  const { storeId, chatId, threadId } = params
  if (!Number.isInteger(threadId) || threadId <= 0) return

  const [chat] = await db
    .select({ id: telegramChats.id })
    .from(telegramChats)
    .where(
      and(
        eq(telegramChats.ownerId, storeId),
        eq(telegramChats.chatId, chatId),
      ),
    )
    .limit(1)
  if (!chat) return

  // Any topic message proves the chat is a forum.
  await db
    .update(telegramChats)
    .set({ isForum: true, updatedAt: new Date() })
    .where(eq(telegramChats.id, chat.id))

  const name = params.name?.trim() || `Tópico ${threadId}`
  const now = new Date()
  await db
    .insert(telegramTopics)
    .values({
      ownerId: storeId,
      chatId,
      threadId,
      name,
      source: "auto",
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [
        telegramTopics.ownerId,
        telegramTopics.chatId,
        telegramTopics.threadId,
      ],
      set: params.name?.trim()
        ? { name, lastSeenAt: now, updatedAt: now }
        : { lastSeenAt: now, updatedAt: now },
    })
}
