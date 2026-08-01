"use server"

import { db } from "@/lib/db"
import {
  telegramPosts,
  telegramSchedules,
  telegramQueue,
} from "@/lib/db/schema"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { enqueuePost, processQueue, type TargetSpec } from "@/lib/tg/queue"
import { nextRun, parseRecurrence, type Recurrence } from "@/lib/tg/recurrence"
import { resolveButtonUrl, type ButtonRows } from "@/lib/tg/buttons"
import { revalidatePath } from "next/cache"
import { sanitizeTelegramHtml, sanitizeDisplayName, validateSafeUrl } from "@/lib/validation"

export type PostInput = {
  id?: number
  title?: string
  text?: string
  parseMode?: "HTML" | "Markdown"
  mediaIds?: number[]
  buttons?: ButtonRows
}

// Persists a post as a draft (create or update). Returns the row id.
export async function savePost(input: PostInput, revalidate = true): Promise<number> {
  try {
    const user = await requireCapability("posts.manage")
    // Validation: prevent XSS, HTML injection and protocol bypass.
    const title = sanitizeDisplayName(input.title)
    const text = input.parseMode === "HTML" ? sanitizeTelegramHtml(input.text) : input.text
    
    const validatedButtons = (input.buttons ?? []).map(row => 
      row.map(btn => {
        const resolved = resolveButtonUrl(btn)
        if (resolved && !resolved.startsWith("http")) {
          // If it's not a standard URL, it might be a callback or formatted link.
          // We validate the resulting URL if it's meant to be one.
          if (["url", "site", "deeplink"].includes(btn.type)) {
            validateSafeUrl(resolved, `Botão "${btn.text}"`)
          }
        } else if (resolved) {
          validateSafeUrl(resolved, `Botão "${btn.text}"`)
        }
        return btn
      })
    )

    const values = {
      ownerId: user.storeId,
      title: title || null,
      text: text ?? null,
      parseMode: input.parseMode ?? "HTML",
      mediaIds: JSON.stringify(input.mediaIds ?? []),
      buttons: JSON.stringify(validatedButtons),
      updatedAt: new Date(),
    }

    if (input.id) {
      const [existing] = await db
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
      await db
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

    const [row] = await db
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
    if (!targets || targets.length === 0) {
      throw new Error("Selecione ao menos um destino.")
    }
    const id = await savePost(input, false)
    const [post] = await db
      .select()
      .from(telegramPosts)
      .where(and(eq(telegramPosts.id, id), eq(telegramPosts.ownerId, user.storeId)))
      .limit(1)
    
    if (!post) throw new Error("Falha ao recuperar postagem salva.")
    assertSendable(post.text, post.mediaIds)

    const enqueued = await enqueuePost({
      storeId: user.storeId,
      postId: id,
      targets,
      scheduledFor: new Date(),
    })
    
    if (enqueued === 0) {
      throw new Error(
        "Nenhum destino válido. Verifique se o bot é admin nos grupos/canais selecionados.",
      )
    }

    // Process the queue immediately so the post is sent to the groups/channels
    // right away. The cron route will still catch anything missed here.
    let sent = 0
    let failed = 0
    try {
      const result = await processQueue(enqueued)
      sent = result.sent
      failed = result.failed
      console.log(
        `[tg/posts] publishNow: ${sent} sent, ${failed} failed out of ${enqueued}`,
      )
    } catch (err) {
      // Best-effort: the cron route will process these items within a minute.
      console.error("[tg/posts] publishNow queue processing failed:", err)
    }

    await logActivity({
      storeId: user.storeId,
      actor: { id: user.id, name: user.name },
      action: `Publicou a postagem "${post.title ?? `#${id}`}" em ${enqueued} destino(s) — ${sent} enviados, ${failed} falhas`,
      category: "posts",
    })

    // Revalidate the posts page to refresh the UI after publishing.
    try {
      revalidatePath("/posts")
    } catch (e) {
      console.error("[tg/posts] revalidatePath failed:", e)
    }

    return { enqueued, sent, failed }
  } catch (err) {
    console.error("[tg/posts] publishNow failed:", err)
    throw new Error(err instanceof Error ? err.message : "Erro ao publicar postagem.")
  }
}

// Schedules a post for later (one-shot or recurring).
export async function schedulePost(
  input: PostInput,
  targets: TargetSpec,
  when: { runAt: string; timezone: string; recurrence: Recurrence },
): Promise<void> {
  const user = await requireCapability("posts.manage")
  if (!targets || targets.length === 0) {
    throw new Error("Selecione ao menos um destino.")
  }
  const runAt = new Date(when.runAt)
  if (Number.isNaN(runAt.getTime())) throw new Error("Data/hora inválida.")
  if (runAt.getTime() < Date.now() - 60_000) {
    throw new Error("Escolha uma data/hora no futuro.")
  }

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
    targets: JSON.stringify(targets),
    scheduleType: isRecurring ? "recurring" : "once",
    runAt,
    timezone: when.timezone,
    recurrence: JSON.stringify(when.recurrence),
    nextRunAt: runAt,
    active: true,
    createdBy: user.id,
    createdByName: user.name,
  })
  await db
    .update(telegramPosts)
    .set({ status: "scheduled", updatedAt: new Date() })
    .where(eq(telegramPosts.id, id))

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

export async function cancelSchedule(id: number) {
  const user = await requireCapability("posts.manage")
  await db
    .update(telegramSchedules)
    .set({ active: false, nextRunAt: null })
    .where(
      and(
        eq(telegramSchedules.id, id),
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
export async function duplicatePost(id: number): Promise<{ newId: number }> {
  const user = await requireCapability("posts.manage")
  const [original] = await db
    .select()
    .from(telegramPosts)
    .where(and(eq(telegramPosts.id, id), eq(telegramPosts.ownerId, user.storeId)))
    .limit(1)
  if (!original) throw new Error("Postagem não encontrada.")

  const [row] = await db
    .insert(telegramPosts)
    .values({
      ownerId: user.storeId,
      title: original.title ? `Cópia: ${original.title}` : null,
      text: original.text,
      parseMode: original.parseMode,
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

export async function deletePost(id: number) {
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
export async function getPostReports(postIds?: number[]) {
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

    const queueByPostId = new Map<number, typeof allQueueItems>()
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
