"use server"

import { db } from "@/lib/db"
import { telegramTemplates } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { requireCapability } from "@/lib/session"
import type { ButtonRows } from "@/lib/tg/buttons"
import { revalidatePath } from "next/cache"
import {
  validateTitle,
  sanitizeTelegramHtml,
  validateTelegramText,
  validateButtonRows,
  validateSerializedJson,
  validateTargets,
} from "@/lib/validation"

export type TemplateInput = {
  id?: number
  name: string
  category?: string
  text?: string
  parseMode?: "HTML" | "Markdown"
  mediaIds?: number[]
  buttons?: ButtonRows
  // Target tokens ("<chatId>" or "<chatId>:<threadId>") pre-selected whenever
  // the template is loaded into the editor.
  defaultTargets?: string[]
}

export async function listTemplates() {
  try {
    const user = await requireCapability("posts.manage")
    return await db
      .select()
      .from(telegramTemplates)
      .where(eq(telegramTemplates.ownerId, user.storeId))
      .orderBy(desc(telegramTemplates.updatedAt))
      .limit(200)
  } catch (err) {
    console.error("[tg/templates] listTemplates failed:", err)
    return []
  }
}

export async function saveTemplate(input: TemplateInput): Promise<number> {
  const user = await requireCapability("posts.manage")
  // Validation: enforce size limits on every persisted field.
  const name = validateTitle(input.name, "Nome do template")
  const category = input.category?.trim()?.slice(0, 128) || "geral"
  const parseMode = input.parseMode ?? "HTML"
  const text = parseMode === "HTML"
    ? (input.text ? sanitizeTelegramHtml(input.text) || null : null)
    : validateTelegramText(input.text)
  const mediaIds = validateSerializedJson(input.mediaIds ?? [], "IDs de mídia")
  const buttons = input.buttons ? validateButtonRows(input.buttons, "Botões") : "[]"
  const defaultTargets = validateTargets(input.defaultTargets ?? [])
  const values = {
    ownerId: user.storeId,
    name,
    category,
    text,
    parseMode,
    mediaIds,
    buttons,
    defaultTargets: JSON.stringify(defaultTargets),
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
