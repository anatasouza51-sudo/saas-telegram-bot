"use server"

import { db } from "@/lib/db"
import { products, categories, settings } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { and, asc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type CategoryInput = {
  name: string
  emoji?: string | null
  description?: string | null
  imageUrl?: string | null
  status?: "active" | "inactive"
  position?: number
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/**
 * Lists every category for the store ordered by (position ASC, name ASC),
 * with a live count of active products in each. Used by the admin panel.
 */
export async function listCategoriesDetailed() {
  const { storeId } = await requireCapability("products.manage")
  return db
    .select({
      id: categories.id,
      name: categories.name,
      emoji: categories.emoji,
      description: categories.description,
      imageUrl: categories.imageUrl,
      position: categories.position,
      status: categories.status,
      createdAt: categories.createdAt,
      productCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${products}
        WHERE ${products.categoryId} = ${categories.id}
      )`,
    })
    .from(categories)
    .where(eq(categories.ownerId, storeId))
    .orderBy(asc(categories.position), asc(categories.name))
}

export async function createCategoryFull(input: CategoryInput) {
  const user = await requireCapability("products.manage")
  // New categories go to the end of the list by default.
  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(${categories.position}), 0)::int` })
    .from(categories)
    .where(eq(categories.ownerId, user.storeId))

  const [row] = await db
    .insert(categories)
    .values({
      ownerId: user.storeId,
      name: input.name,
      slug: slugify(input.name),
      emoji: input.emoji ?? null,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      status: input.status ?? "active",
      position: input.position ?? Number(max) + 1,
    })
    .returning()

  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Criou a categoria "${input.name}"`,
    category: "product",
  })
  revalidatePath("/categories")
  revalidatePath("/products")
  return row
}

export async function updateCategoryFull(id: number, input: CategoryInput) {
  const user = await requireCapability("products.manage")
  await db
    .update(categories)
    .set({
      name: input.name,
      slug: slugify(input.name),
      emoji: input.emoji ?? null,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      status: input.status ?? "active",
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, id), eq(categories.ownerId, user.storeId)))

  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Atualizou a categoria "${input.name}"`,
    category: "product",
  })
  revalidatePath("/categories")
  revalidatePath("/products")
}

export async function setCategoryStatus(id: number, status: "active" | "inactive") {
  const user = await requireCapability("products.manage")
  await db
    .update(categories)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `${status === "active" ? "Ativou" : "Desativou"} a categoria #${id}`,
    category: "product",
  })
  revalidatePath("/categories")
  revalidatePath("/products")
}

export async function deleteCategoryFull(id: number) {
  const user = await requireCapability("products.manage")
  // Detach products so nothing is lost; they become uncategorized.
  await db
    .update(products)
    .set({ categoryId: null })
    .where(and(eq(products.categoryId, id), eq(products.ownerId, user.storeId)))
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Excluiu a categoria #${id}`,
    category: "product",
  })
  revalidatePath("/categories")
  revalidatePath("/products")
}

/**
 * Persists an explicit ordering. Receives the category ids in the desired
 * order and writes sequential positions (1..n) in a single transaction so the
 * order is deterministic regardless of previous values.
 */
export async function reorderCategories(orderedIds: number[]) {
  const user = await requireCapability("products.manage")
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(categories)
        .set({ position: i + 1, updatedAt: new Date() })
        .where(
          and(
            eq(categories.id, orderedIds[i]),
            eq(categories.ownerId, user.storeId),
          ),
        )
    }
  })
  revalidatePath("/categories")
  revalidatePath("/products")
}

/* ---------------------------------------------------------------------------
 * Support "category" configuration (stored in settings)
 * ------------------------------------------------------------------------- */

export type SupportConfig = {
  enabled: boolean
  label: string
  message: string
  telegramUsername: string
  whatsappUrl: string
  hours: string
  buttonLabel: string
}

const SUPPORT_DEFAULTS: SupportConfig = {
  enabled: true,
  label: "💬 Suporte",
  message: "Precisa de ajuda? Fale com o nosso suporte.",
  telegramUsername: "",
  whatsappUrl: "",
  hours: "",
  buttonLabel: "📞 Falar com Suporte",
}

export async function getSupportConfig(): Promise<SupportConfig> {
  const { storeId } = await requireCapability("products.manage")
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.ownerId, storeId))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value ?? ""
  return {
    enabled: (map["support.enabled"] ?? "true") !== "false",
    label: map["support.label"] || SUPPORT_DEFAULTS.label,
    message: map["support.message"] || SUPPORT_DEFAULTS.message,
    telegramUsername: map["support.telegramUsername"] ?? "",
    whatsappUrl: map["support.whatsappUrl"] ?? "",
    hours: map["support.hours"] ?? "",
    buttonLabel: map["support.buttonLabel"] || SUPPORT_DEFAULTS.buttonLabel,
  }
}

export async function saveSupportConfig(input: SupportConfig) {
  const user = await requireCapability("products.manage")
  const entries: Array<[string, string]> = [
    ["support.enabled", input.enabled ? "true" : "false"],
    ["support.label", input.label],
    ["support.message", input.message],
    ["support.telegramUsername", input.telegramUsername],
    ["support.whatsappUrl", input.whatsappUrl],
    ["support.hours", input.hours],
    ["support.buttonLabel", input.buttonLabel],
  ]
  await db.transaction(async (tx) => {
    for (const [key, value] of entries) {
      const existing = await tx
        .select({ id: settings.id })
        .from(settings)
        .where(and(eq(settings.ownerId, user.storeId), eq(settings.key, key)))
      if (existing.length > 0) {
        await tx
          .update(settings)
          .set({ value, updatedAt: new Date() })
          .where(and(eq(settings.ownerId, user.storeId), eq(settings.key, key)))
      } else {
        await tx
          .insert(settings)
          .values({ ownerId: user.storeId, key, value })
      }
    }
  })
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: "Configurações de suporte atualizadas",
    category: "settings",
  })
  revalidatePath("/categories")
  return { ok: true }
}
