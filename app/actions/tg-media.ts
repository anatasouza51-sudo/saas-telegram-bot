"use server"

import { db } from "@/lib/db"
import { telegramMedia, telegramMediaFolders } from "@/lib/db/schema"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { revalidatePath } from "next/cache"
import { validateTitle } from "@/lib/validation"

function publicMedia<T extends { fileId?: unknown; thumbFileId?: unknown }>(row: T) {
  return { ...row, fileId: "", thumbFileId: null }
}

export async function listFolders() {
  const user = await requireCapability("posts.manage")
  return db
    .select()
    .from(telegramMediaFolders)
    .where(eq(telegramMediaFolders.ownerId, user.storeId))
    .orderBy(telegramMediaFolders.name)
}

export async function listMedia(opts?: {
  folderId?: number | null
  type?: string
  search?: string
}) {
  try {
    const user = await requireCapability("posts.manage")
    const conds = [eq(telegramMedia.ownerId, user.storeId)]
    if (opts?.folderId === null) {
      conds.push(isNull(telegramMedia.folderId))
    } else if (typeof opts?.folderId === "number") {
      conds.push(eq(telegramMedia.folderId, opts.folderId))
    }
    if (opts?.type && opts.type !== "all") {
      conds.push(eq(telegramMedia.type, opts.type))
    }
    if (opts?.search) {
      conds.push(sql`${telegramMedia.fileName} ILIKE ${"%" + opts.search + "%"}`)
    }
    const rows = await db
      .select()
      .from(telegramMedia)
      .where(and(...conds))
      .orderBy(desc(telegramMedia.createdAt))
      .limit(500)
    return rows.map(publicMedia)
  } catch {
    console.error("[tg/media] listMedia failed")
    return []
  }
}

export async function createFolder(name: string, parentId?: number | null) {
  const user = await requireCapability("posts.manage")
  const clean = validateTitle(name, "Nome da pasta")
  let safeParentId: number | null = null
  if (parentId != null) {
    const [parent] = await db
      .select({ id: telegramMediaFolders.id })
      .from(telegramMediaFolders)
      .where(and(eq(telegramMediaFolders.id, parentId), eq(telegramMediaFolders.ownerId, user.storeId)))
      .limit(1)
    if (!parent) throw new Error("Pasta pai não encontrada")
    safeParentId = parent.id
  }
  const [row] = await db
    .insert(telegramMediaFolders)
    .values({ ownerId: user.storeId, name: clean, parentId: safeParentId })
    .returning()
  revalidatePath("/media")
  return row
}

export async function renameFolder(id: number, name: string) {
  const user = await requireCapability("posts.manage")
  const clean = validateTitle(name, "Nome da pasta")
  await db
    .update(telegramMediaFolders)
    .set({ name: clean })
    .where(
      and(
        eq(telegramMediaFolders.id, id),
        eq(telegramMediaFolders.ownerId, user.storeId),
      ),
    )
  revalidatePath("/media")
}

export async function deleteFolder(id: number) {
  const user = await requireCapability("posts.manage")
  // Detach media from the folder before removing it (media itself is kept).
  await db
    .update(telegramMedia)
    .set({ folderId: null })
    .where(
      and(
        eq(telegramMedia.folderId, id),
        eq(telegramMedia.ownerId, user.storeId),
      ),
    )
  await db
    .delete(telegramMediaFolders)
    .where(
      and(
        eq(telegramMediaFolders.id, id),
        eq(telegramMediaFolders.ownerId, user.storeId),
      ),
    )
  revalidatePath("/media")
}

export async function moveMedia(mediaId: number, folderId: number | null) {
  const user = await requireCapability("posts.manage")
  if (folderId != null) {
    const [folder] = await db
      .select({ id: telegramMediaFolders.id })
      .from(telegramMediaFolders)
      .where(and(eq(telegramMediaFolders.id, folderId), eq(telegramMediaFolders.ownerId, user.storeId)))
      .limit(1)
    if (!folder) throw new Error("Pasta não encontrada")
  }
  await db
    .update(telegramMedia)
    .set({ folderId })
    .where(
      and(
        eq(telegramMedia.id, mediaId),
        eq(telegramMedia.ownerId, user.storeId),
      ),
    )
  revalidatePath("/media")
}

export async function deleteMedia(mediaId: number) {
  const user = await requireCapability("posts.manage")
  // We only drop our DB reference. The bytes remain on Telegram's servers in
  // the CDN chat; there is no public URL to invalidate.
  const [row] = await db
    .delete(telegramMedia)
    .where(
      and(
        eq(telegramMedia.id, mediaId),
        eq(telegramMedia.ownerId, user.storeId),
      ),
    )
    .returning()
  if (row) {
    await logActivity({
      storeId: user.storeId,
      actor: { id: user.id, name: user.name },
      action: `Removeu mídia "${row.fileName ?? row.type}" da biblioteca`,
      category: "posts",
    })
  }
  revalidatePath("/media")
}
