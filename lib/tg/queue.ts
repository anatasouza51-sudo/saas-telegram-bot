import "server-only"
import { db } from "@/lib/db"
import { setTenantLocal, withTenantTx, type TenantTx } from "@/lib/db/tenant-tx"
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
import { decrypt } from "@/lib/crypto"
import { parseTarget, type Destination } from "@/lib/tg/topics"
import type { TelegramMediaKind } from "@/lib/telegram"

const SEND_DELAY_MS = 120
const BATCH_SIZE = 20
const BACKOFF_BASE_MS = 30_000
const STALE_PROCESSING_MS = 10 * 60_000

type TenantDb = TenantTx | typeof db

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type TargetSpec = string[]

export async function resolveTargets(
  storeId: string,
  targets: TargetSpec,
  dctx: TenantDb = db,
): Promise<Destination[]> {
  const rows = await dctx
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
    (r) => r.status === "active" && r.purpose === "audience",
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

export async function enqueuePost(
  params: {
    storeId: string
    postId: string
    targets: TargetSpec
    scheduleId?: number | null
    scheduledFor?: Date
  },
  tx?: TenantTx,
): Promise<number> {
  const enqueue = async (dctx: TenantDb) => {
    const destinations = await resolveTargets(params.storeId, params.targets, dctx)
    if (destinations.length === 0) return 0
    await dctx.insert(telegramQueue).values(
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
    await dctx
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

  return tx
    ? enqueue(tx)
    : withTenantTx(params.storeId, enqueue)
}

async function resolveMedia(
  storeId: string,
  mediaIdsJson: string | null,
  dctx: TenantDb = db,
): Promise<ResolvedMedia[]> {
  if (!mediaIdsJson) return []
  const ids = parseMediaIds(mediaIdsJson)
  if (ids.length === 0) return []
  const rows = await dctx
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
    .map((r) => ({ fileId: decrypt(r!.fileId) ?? r!.fileId, type: r!.type as TelegramMediaKind }))
}

async function claimPendingItems(
  now: Date,
  limit: number,
  specificIds?: number[],
) {
  return db.transaction(async (tx) => {
    // Discovery is intentionally multi-tenant because the worker has no
    // session. The trusted ownerId is read from each selected row before the
    // tenant-local setting is applied to its claim update.
    const conds = [eq(telegramQueue.status, "pending")]
    if (specificIds && specificIds.length > 0) {
      conds.push(inArray(telegramQueue.id, specificIds))
    } else {
      conds.push(lte(telegramQueue.scheduledFor, now))
    }

    const candidates = await tx
      .select()
      .from(telegramQueue)
      .where(and(...conds))
      .orderBy(asc(telegramQueue.scheduledFor))
      .limit(limit)
      .for("update", { skipLocked: true })

    const claimed = []
    for (const item of candidates) {
      await setTenantLocal(tx, item.ownerId)
      const [claimedItem] = await tx
        .update(telegramQueue)
        .set({ status: "processing", updatedAt: new Date() })
        .where(
          and(
            eq(telegramQueue.id, item.id),
            eq(telegramQueue.ownerId, item.ownerId),
            eq(telegramQueue.status, "pending"),
          ),
        )
        .returning()
      if (claimedItem) claimed.push(claimedItem)
    }

    return claimed
  })
}

export async function processQueue(
  limit = BATCH_SIZE,
  specificIds?: number[],
): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date()
  await requeueStaleItems(now)
  const items = await claimPendingItems(now, limit, specificIds)

  if (items.length === 0) return { processed: 0, sent: 0, failed: 0 }

  const clients = new Map<string, Awaited<ReturnType<typeof getStoreTelegram>>>()
  const posts = new Map<string, Awaited<ReturnType<typeof loadPost>>>()
  const postOwners = new Map<string, string>()

  let sent = 0
  let failed = 0

  for (const item of items) {
    postOwners.set(item.postId, item.ownerId)
    try {
      const context = await withTenantTx(item.ownerId, async (tx) => {
        let cfg = clients.get(item.ownerId)
        if (!cfg) {
          cfg = await getStoreTelegram(item.ownerId, tx)
          clients.set(item.ownerId, cfg)
        }

        let post = posts.get(item.postId)
        if (post === undefined) {
          post = await loadPost(item.ownerId, item.postId, tx)
          posts.set(item.postId, post)
        }

        return { cfg, post }
      })

      if (!context.cfg.client) {
        console.error(`[Queue] Item ${item.id} failed: Bot not configured for store ${item.ownerId}`)
        await withTenantTx(item.ownerId, async (tx) => {
          await failItem(item.id, item.attempts, item.maxAttempts, "Bot não configurado", tx)
        })
        failed++
        continue
      }

      if (!context.post) {
        console.error(`[Queue] Item ${item.id} failed: Post ${item.postId} not found`)
        await withTenantTx(item.ownerId, async (tx) => {
          await failItem(item.id, item.attempts, item.maxAttempts, "Postagem não encontrada", tx)
        })
        failed++
        continue
      }

      console.log(`[Queue] Sending post ${item.postId} to chat ${item.chatId} (Attempt ${item.attempts + 1})`)
      const res = await sendPost(
        context.cfg.client,
        item.chatId,
        context.post.renderable,
        null, // Força threadId nulo no envio real
      )

      if (res.ok) {
        console.log(`[Queue] Item ${item.id} sent successfully. MessageId: ${res.messageId}`)
        await withTenantTx(item.ownerId, async (tx) => {
          await tx
            .update(telegramQueue)
            .set({
              status: "sent",
              sentMessageId: res.messageId ?? null,
              updatedAt: new Date(),
            })
            .where(eq(telegramQueue.id, item.id))
        })
        sent++
      } else {
        console.error(`[Queue] Item ${item.id} failed to send to ${item.chatId}: ${res.error}`)
        await withTenantTx(item.ownerId, async (tx) => {
          await failItem(item.id, item.attempts, item.maxAttempts, res.error ?? "Erro", tx)
        })
        failed++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado"
      console.error(`[tg/queue] item ${item.id} failed:`, err)
      failed++
      try {
        await withTenantTx(item.ownerId, async (tx) => {
          await failItem(item.id, item.attempts, item.maxAttempts, message, tx)
        })
      } catch (persistErr) {
        console.error("[tg/queue] could not persist failure:", persistErr)
        throw err
      }
    }

    await sleep(SEND_DELAY_MS)
  }

  await finalizePosts(
    Array.from(postOwners, ([postId, ownerId]) => ({ postId, ownerId })),
  )

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

async function loadPost(
  storeId: string,
  postId: string,
  dctx: TenantDb = db,
) {
  const [row] = await dctx
    .select()
    .from(telegramPosts)
    .where(and(eq(telegramPosts.id, postId), eq(telegramPosts.ownerId, storeId)))
    .limit(1)
  if (!row) return null
  const media = await resolveMedia(storeId, row.mediaIds, dctx)
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
  dctx: TenantDb = db,
) {
  const next = attempts + 1
  if (next >= maxAttempts) {
    await dctx
      .update(telegramQueue)
      .set({ status: "failed", attempts: next, lastError: error, updatedAt: new Date() })
      .where(eq(telegramQueue.id, id))
  } else {
    const delay = BACKOFF_BASE_MS * Math.pow(2, attempts)
    await dctx
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

type FinalizationNotice = {
  ownerId: string
  level: "success" | "error"
  title: string
  details: string
}

async function finalizePosts(
  posts: Array<{ postId: string; ownerId: string }>,
) {
  for (const { postId, ownerId } of posts) {
    try {
      const notice = await withTenantTx(ownerId, async (tx) =>
        finalizePost(postId, ownerId, tx),
      )
      if (notice) {
        await notifyManagement(
          notice.ownerId,
          notice.level,
          notice.title,
          notice.details,
        )
      }
    } catch (err) {
      console.error(`[tg/queue] could not finalize post ${postId}:`, err)
    }
  }
}

async function finalizePost(
  postId: string,
  ownerId: string,
  dctx: TenantDb = db,
): Promise<FinalizationNotice | null> {
  const [counts] = await dctx
    .select({
      pending: sql<number>`COUNT(*) FILTER (WHERE status IN ('pending','processing'))::int`,
      sent: sql<number>`COUNT(*) FILTER (WHERE status = 'sent')::int`,
      failed: sql<number>`COUNT(*) FILTER (WHERE status = 'failed')::int`,
    })
    .from(telegramQueue)
    .where(
      and(
        eq(telegramQueue.postId, postId),
        eq(telegramQueue.ownerId, ownerId),
      ),
    )

  if (!counts || counts.pending > 0) return null

  const [post] = await dctx
    .select()
    .from(telegramPosts)
    .where(
      and(eq(telegramPosts.id, postId), eq(telegramPosts.ownerId, ownerId)),
    )
    .limit(1)
  if (!post || post.status === "sent" || post.status === "failed") return null

  const status = counts.sent > 0 ? "sent" : "failed"
  await dctx
    .update(telegramPosts)
    .set({ status, sentAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(telegramPosts.id, postId), eq(telegramPosts.ownerId, ownerId)),
    )

  if (post.mediaIds) {
    const ids = parseMediaIds(post.mediaIds)
    if (ids.length) {
      await dctx
        .update(telegramMedia)
        .set({ usageCount: sql`${telegramMedia.usageCount} + 1` })
        .where(
          and(
            eq(telegramMedia.ownerId, ownerId),
            inArray(telegramMedia.id, ids),
          ),
        )
    }
  }

  return {
    ownerId,
    level: status === "sent" ? "success" : "error",
    title: `Postagem "${post.title ?? `#${post.id}`}" ${status === "sent" ? "publicada" : "falhou"}`,
    details: `Enviadas: ${counts.sent} • Falhas: ${counts.failed}`,
  }
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
