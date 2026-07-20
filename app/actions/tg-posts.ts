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
import type { ButtonRows } from "@/lib/tg/buttons"
import { revalidatePath } from "next/cache"

export type PostInput = {
  id?: number
  title?: string
  text?: string
  parseMode?: "HTML" | "Markdown"
  mediaIds?: number[]
  buttons?: ButtonRows
}

// Persists a post as a draft (create or update). Returns the row id.
export async function savePost(input: PostInput): Promise<number> {
  const user = await requireCapability("posts.manage")
  const values = {
    ownerId: user.storeId,
    title: input.title?.trim() || null,
    text: input.text ?? null,
    parseMode: input.parseMode ?? "HTML",
    mediaIds: JSON.stringify(input.mediaIds ?? []),
    buttons: JSON.stringify(input.buttons ?? []),
    updatedAt: new Date(),
  }

  if (input.id) {
    // Only touch a draft/failed post the caller owns; never rewrite a sent one.
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
    revalidatePath("/posts")
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
  revalidatePath("/posts")
  return row.id
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
): Promise<{ enqueued: number }> {
  const user = await requireCapability("posts.manage")
  if (!targets || targets.length === 0) {
    throw new Error("Selecione ao menos um destino.")
  }
  const id = await savePost(input)
  const [post] = await db
    .select()
    .from(telegramPosts)
    .where(and(eq(telegramPosts.id, id), eq(telegramPosts.ownerId, user.storeId)))
    .limit(1)
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

  await logActivity({
    storeId: user.storeId,
    actor: { id: user.id, name: user.name },
    action: `Publicou a postagem "${post.title ?? `#${id}`}" em ${enqueued} destino(s)`,
    category: "posts",
  })

  // Fire-and-forget first drain; cron handles the rest/retries.
  processQueue().catch(() => {})
  revalidatePath("/posts")
  return { enqueued }
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

  const id = await savePost(input)
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
  const user = await requireCapability("posts.manage")
  const conds = [eq(telegramPosts.ownerId, user.storeId)]
  if (status && status !== "all") {
    if (status === "history") {
      conds.push(inArray(telegramPosts.status, ["sent", "failed"]))
    } else {
      conds.push(eq(telegramPosts.status, status))
    }
  }
  return db
    .select()
    .from(telegramPosts)
    .where(and(...conds))
    .orderBy(desc(telegramPosts.updatedAt))
    .limit(200)
}

export async function listSchedules() {
  const user = await requireCapability("posts.manage")
  return db
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

// Lightweight stats for the dashboard cards.

// Fetches post reports with queue details for the reporting UI.
export async function getPostReports(postIds?: number[]) {
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

  const reports = []
  for (const post of posts) {
    const queueItems = await db
      .select()
      .from(telegramQueue)
      .where(
        and(
          eq(telegramQueue.ownerId, user.storeId),
          eq(telegramQueue.postId, post.id),
        ),
      )
      .orderBy(asc(telegramQueue.scheduledFor))

    reports.push({
      postId: post.id,
      title: post.title,
      status: post.status,
      sentAt: post.sentAt,
      queue: queueItems,
    })
  }

  return reports
}
export async function getPostStats() {
  const user = await requireCapability("posts.manage")
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
    .where(eq(telegramPosts.ownerId, user.storeId))
  return row
}
