import "server-only"
import { db } from "@/lib/db"
import { categories, products } from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"

/**
 * Server-only catalog queries. They take a raw storeId and perform no auth
 * checks, so callers must authorize first (e.g. via requireCapability).
 */

/** Categories of a store in display order (position ASC, then name ASC). */
export async function listCategoriesForStore(storeId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      emoji: categories.emoji,
      description: categories.description,
      status: categories.status,
      position: categories.position,
    })
    .from(categories)
    .where(eq(categories.ownerId, storeId))
    .orderBy(asc(categories.position), asc(categories.name))
}

/**
 * Deletes a category, detaching its products first so nothing is lost — they
 * become uncategorized instead of being removed with the category.
 */
export async function deleteCategoryForStore(storeId: string, id: number) {
  await db
    .update(products)
    .set({ categoryId: null })
    .where(and(eq(products.categoryId, id), eq(products.ownerId, storeId)))
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.ownerId, storeId)))
}
