"use server"

import { db } from "@/lib/db"
import { withTenantTx, type TenantDb } from "@/lib/db/tenant-tx"
import {
  telegramPosts,
  telegramSchedules,
  telegramQueue,
} from "@/lib/db/schema"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { requireCapability, type SessionUser } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { enqueuePost, processQueue, resolveTargets, type TargetSpec } from "@/lib/tg/queue"
import { nextRun, parseRecurrence, type Recurrence } from "@/lib/tg/recurrence"
import { type ButtonRows } from "@/lib/tg/buttons"
import { revalidatePath } from "next/cache"
import { sanitizeTelegramHtml, validateTelegramText, validateButtonRows, validatePostTitle, validateSerializedJson, validateTargets, validateTimezone, validateRecurrence } from "@/lib/validation"

export type PostInput = {
  id?: string
  title?: string
  text?: string
  parseMode?: "HTML" | "Markdown"
  mediaIds?: number[]
  buttons?: ButtonRows
}

// Persists a post as a draft (create or update). Returns the row id.
async function savePostForUser(
  input: PostInput,
  user: SessionUser,
  revalidate: boolean,
  dctx: TenantDb,
): Promise<string> {
  // Validation: prevent XSS, HTML injection, protocol bypass AND oversized payloads.
  const title = validatePostTitle(input.title)
  const parseMode = input.parseMode ?? "HTML"
  const rawText = parseMode === "HTML" ? sanitizeTelegramHtml(input.text) : validateTelegramText(input.text)
  const text = rawText ?? input.text  // fallback for Markdown mode (Telegram will reject oversized messages)

  // Validate buttons: enforce max rows, buttons per row, text/value lengths, callback_data 64-byte cap.
  const validatedButtons = input.buttons ? validateButtonRows(input.buttons, "Botões") : "[]"

  const values = {
    ownerId: user.storeId,
    title: title || null,
    text: text ?? null,
    parseMode,
    mediaIds: validateSerializedJson(input.mediaIds ?? [], "IDs de mídia"),
    buttons: validatedButtons,
    updatedAt: new Date(),
  }

  if (input.id) {
    const [existing] = await dctx
      .select({ status: telegramPosts.status })
      .from(telegramPosts)
      .where(
        and(
          eq(telegramPosts.id, input.id),
          eq(telegramPosts.ownerId, user.storeId),
        ),
      )
      .limit(1)
    if (!existing) throw new Error("Postagem não encontrada.")
    await dctx
      .update(telegramPosts)
      .set(values)
      .where(
        and(
          eq(telegramPosts.id, input.id),
          eq(telegramPosts.ownerId, user.storeId),
        ),
      )
    if (revalidate) revalidatePath("/posts")
    return input.id
  }

  const [row] = await dctx
    .insert(telegramPosts)
    .values({
      ...values,
      status: "draft",
      createdBy: user.id,
      createdByName: user.name,
    })
    .returning({ id: telegramPosts.id })
  if (revalidate) revalidatePath("/posts")
  return row.id
}

export async function savePost(
  input: PostInput,
  revalidate = true,
  dctx: TenantDb = db,
): Promise<string> {
  try {
    const user = await requireCapability("posts.manage")
    return await savePostForUser(input, user, revalidate, dctx)
  } catch (err) {
    console.error("[tg/posts] savePost failed:", err)
    throw new Error(err instanceof Error ? err.message : "Erro ao salvar postagem.")
  }
}

// Validates that a post has something to send.
function assertSendable(text: string | null, mediaIds: string | null) {
  const hasText = Boolean(text && text.trim())
  let hasMedia = false
  try {
    hasMedia = Array.isArray(JSON.parse(mediaIds ?? "[]")) &&
      JSON.parse(mediaIds ?? "[]").length > 0
  } catch {
    hasMedia = false
  }
  if (!hasText && !hasMedia) {
    throw new Error("A postagem precisa de texto ou pelo menos uma mídia.")
  }
}

// Publishes immediately: saves, enqueues to targets, and kicks the queue once
// so the user sees near-instant delivery without waiting for cron.
export async function publishNow(
  input: PostInput,
  targets: TargetSpec,
): Promise<{ enqueued: number; sent: number; failed: number }> {
  try {
    const user = await requireCapability("posts.manage")
    const validatedTargets = validateTargets(targets)
    if (validatedTargets.length === 0) {
      throw new Error("Selecione ao menos um destino.")
    }
    // Keep the draft save, reread, target resolution, enqueue and status update
    // in one tenant-local transaction. savePost still defaults to db for its
    // existing callers, but this path passes the active tx explicitly.
    const { id, post, enqueued, queueIds } = await withTenantTx(
      user.storeId,
      async (tx) => {
        const id = await savePostForUser(input, user, false, tx)
        const [post] = await tx
          .select()
          .from(telegramPosts)
          .where(
            and(
              eq(telegramPosts.id, id),
              eq(telegramPosts.ownerId, user.storeId),
            ),
          )
          .limit(1)

        if (!post) throw new Error("Falha ao recuperar postagem salva.")
        assertSendable(post.text, post.mediaIds)

        const destinations = await resolveTargets(user.storeId, validatedTargets, tx)
        if (destinations.length === 0) {
          return { id, post, enqueued: 0, queueIds: [] as number[] }
        }

        const rows = await tx
          .insert(telegramQueue)
          .values(
            destinations.map((dest) => ({
              ownerId: user.storeId,
              postId: id,
              chatId: dest.chatId,
              messageThreadId: null,
              scheduledFor: new Date(),
              status: "pending" as const,
            })),
          )
          .returning({ id: telegramQueue.id })

        await tx
          .update(telegramPosts)
          .set({ status: "queued", updatedAt: new Date() })
          .where(
            and(
              eq(telegramPosts.id, id),
              eq(telegramPosts.ownerId, user.storeId),
            ),
          )

        return {
          id,
          post,
          enqueued: destinations.length,
          queueIds: rows.map((r) => r.id),
        }
      },
    )

    if (enqueued === 0) {
      throw new Error(
        "Nenhum destino válido. Verifique se o bot é admin nos grupos/canais selecionados.",
      )
    }

    // Process ONLY the items we just enqueued to avoid duplicate sends or
    // processing items from other concurrent clicks/cron runs.
    let sent = 0
    let failed = 0
    let queueError: string | null = null

    try {
      // processQueue already uses FOR UPDATE SKIP LOCKED, so even if cron
      // starts now, it won't touch these specific IDs if we process them first.
      const result = await processQueue(enqueued, queueIds)
      sent = result.sent
      failed = result.failed
      
      console.log(`[tg/posts] publishNow success: ${sent} sent, ${failed} failed out of ${enqueued}`)
      
      // If all failed, we want to know why from the first item. The read is
      // intentionally deferred to the same tenant-local boundary as the log.
      if (failed === enqueued && enqueued > 0) {
        queueError = "Falha desconhecida no envio."
      }
    } catch (err) {
      queueError = err instanceof Error ? err.message : "Erro no processamento da fila."
      console.error("[tg/posts] publishNow queue processing failed:", err)
    }

    queueError = await withTenantTx(user.storeId, async (tx) => {
      let resolvedError = queueError
      if (failed === enqueued && enqueued > 0) {
        const [firstItem] = await tx
          .select({ lastError: telegramQueue.lastError })
          .from(telegramQueue)
          .where(
            and(
              inArray(telegramQueue.id, queueIds),
              eq(telegramQueue.ownerId, user.storeId),
            ),
          )
          .limit(1)
        resolvedError = firstItem?.lastError || resolvedError
      }

      await logActivity({
        storeId: user.storeId,
        actor: { id: user.id, name: user.name },
        action: `Publicou a postagem "${post.title ?? `#${id}`}" em ${enqueued} destino(s) — ${sent} enviados, ${failed} falhas`,
        category: "posts",
      }, tx)

      return resolvedError
    })

    // Revalidate the posts page to refresh the UI after publishing.
    try {
      revalidatePath("/posts")
    } catch (e) {
      console.error("[tg/posts] revalidatePath failed:", e)
    }

    if (queueError && sent === 0) {
      throw new Error(`Falha no envio: ${queueError}`)
    }

    return { enqueued, sent, failed }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao publicar postagem."
    console.error(`[tg/posts] publishNow failed | Error: ${message}`)
    throw new Error(message)
  }
}

// Schedules a post for later (one-shot or recurring).
export async function schedulePost(
  input: PostInput,
  targets: TargetSpec,
  when: { runAt: string; timezone: string; recurrence: Recurrence },
): Promise<void> {
  const user = await requireCapability("posts.manage")
  const validatedTargets = validateTargets(targets)
  if (validatedTargets.length === 0) {
    throw new Error("Selecione ao menos um destino.")
  }
  const runAt = new Date(when.runAt)
  if (Number.isNaN(runAt.getTime())) throw new Error("Data/hora inválida.")
  if (runAt.getTime() < Date.now() - 60_000) {
    throw new Error("Escolha uma data/hora no futuro.")
  }
  const timezone = validateTimezone(when.timezone)
  const recurrenceStr = validateRecurrence(when.recurrence)

  const id = await savePost(input, false)
  const [post] = await db
    .select()
    .from(telegramPosts)
    .where(and(eq(telegramPosts.id, id), eq(telegramPosts.ownerId, user.storeId)))
    .limit(1)
  assertSendable(post.text, post.mediaIds)

  const isRecurring = when.recurrence.kind !== "once"
  await db.insert(telegramSchedules).values({
    ownerId: user.storeId,
    postId: id,
    targets: JSON.stringify(validatedTargets),
    scheduleType: isRecurring ? "recurring" : "once",
    runAt,
    timezone,
    recurrence: recurrenceStr,
    nextRunAt: runAt,
    active: true,
    createdBy: user.id,
    createdByName: user.name,
  })
  await db
    .update(telegramPosts)
    .set({ status: "scheduled", updatedAt: new Date() })
    .where(
      and(eq(telegramPosts.id, id), eq(telegramPosts.ownerId, user.storeId)),
    )

  await logActivity({
    storeId: user.storeId,
    actor: { id: user.id, name: user.name },
    action: `Agendou a postagem "${post.title ?? `#${id}`}" para ${runAt.toLocaleString("pt-BR")}`,
    category: "posts",
  })
  
  revalidatePath("/posts")
}

export async function listPosts(status?: string) {
  try {
    const user = await requireCapability("posts.manage")
    const conds = [eq(telegramPosts.ownerId, user.storeId)]
    if (status && status !== "all") {
      if (status === "history") {
        conds.push(inArray(telegramPosts.status, ["sent", "failed"]))
      } else {
        conds.push(eq(telegramPosts.status, status))
      }
    }
    return await db
      .select()
      .from(telegramPosts)
      .where(and(...conds))
      .orderBy(desc(telegramPosts.updatedAt))
      .limit(200)
  } catch (err) {
    console.error("[tg/posts] listPosts failed:", err)
    return []
  }
}

export async function listSchedules() {
  try {
    const user = await requireCapability("posts.manage")
    return await db
      .select({
        id: telegramSchedules.id,
        postId: telegramSchedules.postId,
        scheduleType: telegramSchedules.scheduleType,
        runAt: telegramSchedules.runAt,
        nextRunAt: telegramSchedules.nextRunAt,
        recurrence: telegramSchedules.recurrence,
        active: telegramSchedules.active,
        targets: telegramSchedules.targets,
        createdByName: telegramSchedules.createdByName,
        postTitle: telegramPosts.title,
      })
      .from(telegramSchedules)
      .leftJoin(telegramPosts, eq(telegramSchedules.postId, telegramPosts.id))
      .where(eq(telegramSchedules.ownerId, user.storeId))
      .orderBy(desc(telegramSchedules.nextRunAt))
      .limit(200)
  } catch (err) {
    console.error("[tg/posts] listSchedules failed:", err)
    return []
  }
}

export async function cancelSchedule(id: number | string) {
  const user = await requireCapability("posts.manage")
  const scheduleId = typeof id === "string" ? Number(id) : id
  await db
    .update(telegramSchedules)
    .set({ active: false, nextRunAt: null })
    .where(
      and(
        eq(telegramSchedules.id, scheduleId),
        eq(telegramSchedules.ownerId, user.storeId),
      ),
    )
  await logActivity({
    storeId: user.storeId,
    actor: { id: user.id, name: user.name },
    action: `Cancelou o agendamento #${id}`,
    category: "posts",
  })
  revalidatePath("/posts")
}

// Duplicates an existing post (any status) as a new draft. Used to reuse
// old/history posts as new postings.
export async function duplicatePost(id: string): Promise<{ newId: string }> {
  const user = await requireCapability("posts.manage")
  const [original] = await db
    .select()
    .from(telegramPosts)
    .where(and(eq(telegramPosts.id, id), eq(telegramPosts.ownerId, user.storeId)))
    .limit(1)
  if (!original) throw new Error("Postagem não encontrada.")

  const parseMode = original.parseMode ?? "HTML"
  const rawText = parseMode === "HTML"
    ? sanitizeTelegramHtml(original.text)
    : validateTelegramText(original.text)
  const text = rawText ?? original.text

  const [row] = await db
    .insert(telegramPosts)
    .values({
      ownerId: user.storeId,
      title: original.title ? `Cópia: ${original.title}` : null,
      text,
      parseMode,
      mediaIds: original.mediaIds,
      buttons: original.buttons,
      status: "draft",
      createdBy: user.id,
      createdByName: user.name,
    })
    .returning({ id: telegramPosts.id })

  await logActivity({
    storeId: user.storeId,
    actor: { id: user.id, name: user.name },
    action: `Duplicou a postagem "${original.title ?? `#${id}`}" como rascunho #${row.id}`,
    category: "posts",
  })
  revalidatePath("/posts")
  return { newId: row.id }
}

export async function deletePost(id: string) {
  const user = await requireCapability("posts.manage")
  // Remove dependent queue/schedule rows first (no FK cascade defined).
  await db
    .delete(telegramQueue)
    .where(
      and(
        eq(telegramQueue.postId, id),
        eq(telegramQueue.ownerId, user.storeId),
      ),
    )
  await db
    .delete(telegramSchedules)
    .where(
      and(
        eq(telegramSchedules.postId, id),
        eq(telegramSchedules.ownerId, user.storeId),
      ),
    )
  await db
    .delete(telegramPosts)
    .where(
      and(eq(telegramPosts.id, id), eq(telegramPosts.ownerId, user.storeId)),
    )
  revalidatePath("/posts")
}

// Fetches post reports with queue details for the reporting UI.
export async function getPostReports(postIds?: string[]) {
  try {
    const user = await requireCapability("posts.manage")
    const postConds = [eq(telegramPosts.ownerId, user.storeId)]
    if (postIds && postIds.length > 0) {
      postConds.push(inArray(telegramPosts.id, postIds))
    } else {
      // Only include posts that have been sent, failed, or are currently queued
      postConds.push(inArray(telegramPosts.status, ["sent", "failed", "queued"]))
    }

    const posts = await db
      .select()
      .from(telegramPosts)
      .where(and(...postConds))
      .orderBy(desc(telegramPosts.sentAt))
      .limit(50)

    if (posts.length === 0) return []

    // Buscamos tudo de uma vez com `inArray` e agrupamos em memória.
    const idsToFetch = posts.map((p) => p.id)
    const allQueueItems = await db
      .select()
      .from(telegramQueue)
      .where(
        and(
          eq(telegramQueue.ownerId, user.storeId),
          inArray(telegramQueue.postId, idsToFetch),
        ),
      )
      .orderBy(asc(telegramQueue.scheduledFor))

    const queueByPostId = new Map<string, typeof allQueueItems>()
    for (const item of allQueueItems) {
      const list = queueByPostId.get(item.postId)
      if (list) {
        list.push(item)
      } else {
        queueByPostId.set(item.postId, [item])
      }
    }

    return posts.map((post) => ({
      postId: post.id,
      title: post.title,
      status: post.status,
      sentAt: post.sentAt,
      queue: queueByPostId.get(post.id) ?? [],
    }))
  } catch (err) {
    console.error("[tg/posts] getPostReports failed:", err)
    return []
  }
}

export async function getPostStats() {
  try {
    const session = await requireCapability("posts.manage").catch(() => null)
    if (!session) return {
      total: 0, sent: 0, failed: 0, scheduled: 0, draft: 0, today: 0, week: 0, month: 0
    }

    const [row] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        sent: sql<number>`COUNT(*) FILTER (WHERE status = 'sent')::int`,
        failed: sql<number>`COUNT(*) FILTER (WHERE status = 'failed')::int`,
        scheduled: sql<number>`COUNT(*) FILTER (WHERE status = 'scheduled')::int`,
        draft: sql<number>`COUNT(*) FILTER (WHERE status = 'draft')::int`,
        today: sql<number>`COUNT(*) FILTER (WHERE status = 'sent' AND "sentAt" >= date_trunc('day', now()))::int`,
        week: sql<number>`COUNT(*) FILTER (WHERE status = 'sent' AND "sentAt" >= date_trunc('week', now()))::int`,
        month: sql<number>`COUNT(*) FILTER (WHERE status = 'sent' AND "sentAt" >= date_trunc('month', now()))::int`,
      })
      .from(telegramPosts)
      .where(eq(telegramPosts.ownerId, session.storeId))
    return row ?? {
      total: 0, sent: 0, failed: 0, scheduled: 0, draft: 0, today: 0, week: 0, month: 0
    }
  } catch (err) {
    console.error("[tg/posts] getPostStats failed:", err)
    return {
      total: 0, sent: 0, failed: 0, scheduled: 0, draft: 0, today: 0, week: 0, month: 0
    }
  }
}
