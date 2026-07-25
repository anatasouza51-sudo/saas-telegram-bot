import "server-only"
import { db } from "@/lib/db"
import {
  telegramChats,
  telegramMedia,
  telegramPosts,
  telegramQueue,
} from "@/lib/db/schema"
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm"
import { getStoreTelegram } from "@/lib/tg/config"
import { sendPost, type ResolvedMedia } from "@/lib/tg/send"
import { parseButtons } from "@/lib/tg/buttons"
import { notifyManagement } from "@/lib/tg/management"
import { parseTarget, type Destination } from "@/lib/tg/topics"
import type { TelegramMediaKind } from "@/lib/telegram"

const SEND_DELAY_MS = 120
const BATCH_SIZE = 20
const BACKOFF_BASE_MS = 30_000
const STALE_PROCESSING_MS = 10 * 60_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type TargetSpec = string[]

export async function resolveTargets(
  storeId: string,
  targets: TargetSpec,
): Promise<Destination[]> {
  const rows = await db
    .select({
      chatId: telegramChats.chatId,
      type: telegramChats.type,
      botIsAdmin: telegramChats.botIsAdmin,
      status: telegramChats.status,
      purpose: telegramChats.purpose,
    })
    .from(telegramChats)
    .where(eq(telegramChats.ownerId, storeId))

  const usable = rows.filter(
    (r) => r.status === "active" && r.botIsAdmin && r.purpose === "audience",
  )
  const usableChatIds = new Set(usable.map((r) => r.chatId))

  const wantAll = (targets || []).includes("all")
  const wantGroups = wantAll || (targets || []).includes("all_groups")
  const wantChannels = wantAll || (targets || []).includes("all_channels")
  const explicit = (targets || [])
    .filter((t) => t && !t.startsWith("all"))
    .map(parseTarget)

  const out = new Map<string, Destination>()

  for (const r of usable) {
    const isChannel = r.type === "channel"
    if ((isChannel && wantChannels) || (!isChannel && wantGroups)) {
      out.set(r.chatId, { chatId: r.chatId, threadId: null })
    }
  }
  
  for (const dest of explicit) {
    if (!usableChatIds.has(dest.chatId)) continue
    // Força o envio para o chat geral, ignorando qualquer threadId (tópico)
    out.set(dest.chatId, { chatId: dest.chatId, threadId: null })
  }

  return Array.from(out.values())
}

export async function enqueuePost(params: {
  storeId: string
  postId: number
  targets: TargetSpec
  scheduleId?: number | null
  scheduledFor?: Date
}): Promise<number> {
  const destinations = await resolveTargets(params.storeId, params.targets)
  if (destinations.length === 0) return 0
  await db.insert(telegramQueue).values(
    destinations.map((dest) => ({
      ownerId: params.storeId,
      postId: params.postId,
      scheduleId: params.scheduleId ?? null,
      chatId: dest.chatId,
      messageThreadId: null, // Sempre nulo para garantir envio ao chat geral
      scheduledFor: params.scheduledFor ?? new Date(),
      status: "pending" as const,
    })),
  )
  await db
    .update(telegramPosts)
    .set({ status: "queued", updatedAt: new Date() })
    .where(
      and(
        eq(telegramPosts.id, params.postId),
        eq(telegramPosts.ownerId, params.storeId),
      ),
    )
  return destinations.length
}

async function resolveMedia(
  storeId: string,
  mediaIdsJson: string | null,
): Promise<ResolvedMedia[]> {
  if (!mediaIdsJson) return []
  const ids = parseMediaIds(mediaIdsJson)
  if (ids.length === 0) return []
  const rows = await db
    .select({
      id: telegramMedia.id,
      fileId: telegramMedia.fileId,
      type: telegramMedia.type,
    })
    .from(telegramMedia)
    .where(
      and(
        eq(telegramMedia.ownerId, storeId),
        inArray(telegramMedia.id, ids),
      ),
    )
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((r) => ({ fileId: r!.fileId, type: r!.type as TelegramMediaKind }))
}

export async function processQueue(
  limit = BATCH_SIZE,
): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date()
  await requeueStaleItems(now)
  const items = await db
    .select()
    .from(telegramQueue)
    .where(
      and(
        eq(telegramQueue.status, "pending"),
        lte(telegramQueue.scheduledFor, now),
      ),
    )
    .orderBy(asc(telegramQueue.scheduledFor))
    .limit(limit)

  if (items.length === 0) return { processed: 0, sent: 0, failed: 0 }

  const clients = new Map<string, Awaited<ReturnType<typeof getStoreTelegram>>>()
  const posts = new Map<number, Awaited<ReturnType<typeof loadPost>>>()

  let sent = 0
  let failed = 0

  for (const item of items) {
    try {
      await db
        .update(telegramQueue)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(telegramQueue.id, item.id))

      let cfg = clients.get(item.ownerId)
      if (!cfg) {
        cfg = await getStoreTelegram(item.ownerId)
        clients.set(item.ownerId, cfg)
      }

      if (!cfg.client) {
        await failItem(item.id, item.attempts, item.maxAttempts, "Bot não configurado")
        failed++
        continue
      }

      let post = posts.get(item.postId)
      if (post === undefined) {
        post = await loadPost(item.ownerId, item.postId)
        posts.set(item.postId, post)
      }
      if (!post) {
        await failItem(item.id, item.attempts, item.maxAttempts, "Postagem não encontrada")
        failed++
        continue
      }

      const res = await sendPost(
        cfg.client,
        item.chatId,
        post.renderable,
        null, // Força threadId nulo no envio real
      )

      if (res.ok) {
        await db
          .update(telegramQueue)
          .set({
            status: "sent",
            sentMessageId: res.messageId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(telegramQueue.id, item.id))
        sent++
      } else {
        await failItem(item.id, item.attempts, item.maxAttempts, res.error ?? "Erro")
        failed++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado"
      console.error(`[tg/queue] item ${item.id} failed:`, err)
      failed++
      try {
        await failItem(item.id, item.attempts, item.maxAttempts, message)
      } catch (persistErr) {
        console.error("[tg/queue] could not persist failure:", persistErr)
        throw err
      }
    }

    await sleep(SEND_DELAY_MS)
  }

  await finalizePosts(Array.from(posts.keys()))

  return { processed: items.length, sent, failed }
}

async function requeueStaleItems(now: Date) {
  const cutoff = new Date(now.getTime() - STALE_PROCESSING_MS)
  await db
    .update(telegramQueue)
    .set({
      status: "pending",
      lastError: "Reenfileirado após execução interrompida",
      updatedAt: now,
    })
    .where(
      and(
        eq(telegramQueue.status, "processing"),
        lte(telegramQueue.updatedAt, cutoff),
      ),
    )
}

async function loadPost(storeId: string, postId: number) {
  const [row] = await db
    .select()
    .from(telegramPosts)
    .where(and(eq(telegramPosts.id, postId), eq(telegramPosts.ownerId, storeId)))
    .limit(1)
  if (!row) return null
  const media = await resolveMedia(storeId, row.mediaIds)
  return {
    row,
    renderable: {
      text: row.text ?? "",
      parseMode: (row.parseMode as "HTML" | "Markdown") ?? "HTML",
      media,
      buttons: parseButtons(row.buttons),
    },
  }
}

async function failItem(
  id: number,
  attempts: number,
  maxAttempts: number,
  error: string,
) {
  const next = attempts + 1
  if (next >= maxAttempts) {
    await db
      .update(telegramQueue)
      .set({ status: "failed", attempts: next, lastError: error, updatedAt: new Date() })
      .where(eq(telegramQueue.id, id))
  } else {
    const delay = BACKOFF_BASE_MS * Math.pow(2, attempts)
    await db
      .update(telegramQueue)
      .set({
        status: "pending",
        attempts: next,
        lastError: error,
        scheduledFor: new Date(Date.now() + delay),
        updatedAt: new Date(),
      })
      .where(eq(telegramQueue.id, id))
  }
}

async function finalizePosts(postIds: number[]) {
  for (const postId of postIds) {
    try {
      await finalizePost(postId)
    } catch (err) {
      console.error(`[tg/queue] could not finalize post ${postId}:`, err)
    }
  }
}

async function finalizePost(postId: number) {
  const [counts] = await db
      .select({
        pending: sql<number>`COUNT(*) FILTER (WHERE status IN ('pending','processing'))::int`,
        sent: sql<number>`COUNT(*) FILTER (WHERE status = 'sent')::int`,
        failed: sql<number>`COUNT(*) FILTER (WHERE status = 'failed')::int`,
      })
      .from(telegramQueue)
    .where(eq(telegramQueue.postId, postId))

  if (!counts || counts.pending > 0) return 

  const [post] = await db
    .select()
    .from(telegramPosts)
    .where(eq(telegramPosts.id, postId))
    .limit(1)
  if (!post || post.status === "sent" || post.status === "failed") return

  const status = counts.sent > 0 ? "sent" : "failed"
  await db
    .update(telegramPosts)
    .set({ status, sentAt: new Date(), updatedAt: new Date() })
    .where(eq(telegramPosts.id, postId))

  if (post.mediaIds) {
    const ids = parseMediaIds(post.mediaIds)
    if (ids.length) {
      await db
        .update(telegramMedia)
        .set({ usageCount: sql`${telegramMedia.usageCount} + 1` })
        .where(inArray(telegramMedia.id, ids))
    }
  }

  await notifyManagement(
    post.ownerId,
    status === "sent" ? "success" : "error",
    `Postagem "${post.title ?? `#${post.id}`}" ${status === "sent" ? "publicada" : "falhou"}`,
    `Enviadas: ${counts.sent} • Falhas: ${counts.failed}`,
  )
}

function parseMediaIds(raw: string): number[] {
  try {
    const ids = JSON.parse(raw) as unknown
    return Array.isArray(ids) ? (ids as number[]) : []
  } catch (err) {
    console.error("[tg/queue] malformed mediaIds:", raw, err)
    return []
  }
}
