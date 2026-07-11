"use server"

import { db } from "@/lib/db"
import { telegramTemplates } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import type { ButtonRows } from "@/lib/tg/buttons"
import { revalidatePath } from "next/cache"

export type TemplateInput = {
  id?: number
  name: string
  category?: string
  text?: string
  parseMode?: "HTML" | "Markdown"
  mediaIds?: number[]
  buttons?: ButtonRows
}

export async function listTemplates() {
  const user = await requireCapability("posts.manage")
  return db
    .select()
    .from(telegramTemplates)
    .where(eq(telegramTemplates.ownerId, user.storeId))
    .orderBy(desc(telegramTemplates.updatedAt))
    .limit(200)
}

export async function saveTemplate(input: TemplateInput): Promise<number> {
  const user = await requireCapability("posts.manage")
  const name = input.name?.trim()
  if (!name) throw new Error("Informe um nome para o template.")
  const values = {
    ownerId: user.storeId,
    name,
    category: input.category?.trim() || "geral",
    text: input.text ?? null,
    parseMode: input.parseMode ?? "HTML",
    mediaIds: JSON.stringify(input.mediaIds ?? []),
    buttons: JSON.stringify(input.buttons ?? []),
    updatedAt: new Date(),
  }
  if (input.id) {
    await db
      .update(telegramTemplates)
      .set(values)
      .where(
        and(
          eq(telegramTemplates.id, input.id),
          eq(telegramTemplates.ownerId, user.storeId),
        ),
      )
    revalidatePath("/posts")
    return input.id
  }
  const [row] = await db
    .insert(telegramTemplates)
    .values(values)
    .returning({ id: telegramTemplates.id })
  revalidatePath("/posts")
  return row.id
}

export async function deleteTemplate(id: number) {
  const user = await requireCapability("posts.manage")
  await db
    .delete(telegramTemplates)
    .where(
      and(
        eq(telegramTemplates.id, id),
        eq(telegramTemplates.ownerId, user.storeId),
      ),
    )
  revalidatePath("/posts")
}
