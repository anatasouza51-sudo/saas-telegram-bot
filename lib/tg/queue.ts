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
import type { TelegramMediaKind } from "@/lib/telegram"

// Telegram allows ~30 msgs/sec globally and ~20/min per group. We stay well
// under that: a small delay between sends and a modest per-run batch size.
const SEND_DELAY_MS = 120
const BATCH_SIZE = 20
const BACKOFF_BASE_MS = 30_000
// An item left in `processing` for longer than this is considered orphaned
// (the run that claimed it crashed or timed out) and is requeued.
const STALE_PROCESSING_MS = 10 * 60_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type TargetSpec = string[] // chat ids, or tokens: all | all_groups | all_channels

/**
 * Expands a target spec into concrete, active chat ids where the bot is admin.
 * Chats without admin rights are skipped (they can't receive posts).
 */
export async function resolveTargets(
  storeId: string,
  targets: TargetSpec,
): Promise<string[]> {
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

  const wantAll = targets.includes("all")
  const wantGroups = wantAll || targets.includes("all_groups")
  const wantChannels = wantAll || targets.includes("all_channels")
  const explicit = new Set(targets.filter((t) => !t.startsWith("all")))

  const selected = usable.filter((r) => {
    const isChannel = r.type === "channel"
    if (isChannel && wantChannels) return true
    if (!isChannel && wantGroups) return true
    return explicit.has(r.chatId)
  })

  return Array.from(new Set(selected.map((r) => r.chatId)))
}

/**
 * Creates queue rows for a post against each resolved target chat.
 * Returns the number of enqueued messages.
 */
export async function enqueuePost(params: {
  storeId: string
  postId: number
  targets: TargetSpec
  scheduleId?: number | null
  scheduledFor?: Date
}): Promise<number> {
  const chatIds = await resolveTargets(params.storeId, params.targets)
  if (chatIds.length === 0) return 0
  await db.insert(telegramQueue).values(
    chatIds.map((chatId) => ({
      ownerId: params.storeId,
      postId: params.postId,
      scheduleId: params.scheduleId ?? null,
      chatId,
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
  return chatIds.length
}

// Resolves a post's stored media id list into ordered {fileId,type} entries.
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

/**
 * Processes due queue items: sends each, applies retry/backoff, respects rate
 * limits, and bumps media usage counters. Safe to call from cron or on demand.
 */
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

  // Cache one client + post payload per store/post within this run.
  const clients = new Map<string, Awaited<ReturnType<typeof getStoreTelegram>>>()
  const posts = new Map<number, Awaited<ReturnType<typeof loadPost>>>()

  let sent = 0
  let failed = 0

  for (const item of items) {
    // Every item is isolated: an unexpected error must not abort the batch nor
    // strand the item in `processing` forever.
    try {
      // Mark processing to avoid double-send if runs overlap.
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

      const res = await sendPost(cfg.client, item.chatId, post.renderable)

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
        // The DB is unreachable: stop the run instead of burning the batch
        // against a backend that cannot record any outcome.
        console.error("[tg/queue] could not persist failure:", persistErr)
        throw err
      }
    }

    await sleep(SEND_DELAY_MS)
  }

  // Finalize posts that have no more pending/processing queue items.
  await finalizePosts(Array.from(posts.keys()))

  return { processed: items.length, sent, failed }
}

// Returns items abandoned mid-flight by a crashed run back to `pending` so the
// next run retries them (respecting their attempt counter).
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
  // Count each media use once per post dispatch (not per chat) — bump here.
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
    // Exponential backoff before the next attempt.
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

// Marks posts as sent/failed once their queue is drained, and mirrors a summary
// into the management group.
async function finalizePosts(postIds: number[]) {
  for (const postId of postIds) {
    try {
      await finalizePost(postId)
    } catch (err) {
      // One bad post must not prevent the others from being finalized.
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

  if (!counts || counts.pending > 0) return // still in flight

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

  // Bump usage counters for the media used by this dispatched post.
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

// A malformed media list is a data problem, not a reason to fail the post — it
// is logged and treated as "no media".
function parseMediaIds(raw: string): number[] {
  try {
    const ids = JSON.parse(raw) as unknown
    return Array.isArray(ids) ? (ids as number[]) : []
  } catch (err) {
    console.error("[tg/queue] malformed mediaIds:", raw, err)
    return []
  }
}
