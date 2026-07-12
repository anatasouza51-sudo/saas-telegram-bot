"use server"

import { db } from "@/lib/db"
import { products, categories, stockItems } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { runAutomations } from "@/lib/tg/automations"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type ProductInput = {
  name: string
  description?: string
  categoryId?: number | null
  imageUrl?: string
  price: number
  status?: "active" | "inactive"
  deliveryType?: "stock" | "manual"
  lowStockThreshold?: number
  // Display order within its category (ascending). Ties break by price ASC.
  position?: number
}

export async function listProducts(opts?: {
  search?: string
  status?: string
  categoryId?: number
}) {
  const { storeId } = await requireCapability("products.manage")

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      imageUrl: products.imageUrl,
      price: products.price,
      status: products.status,
      deliveryType: products.deliveryType,
      lowStockThreshold: products.lowStockThreshold,
      position: products.position,
      createdAt: products.createdAt,
      stockAvailable: sql<number>`(
        SELECT COUNT(*)::int FROM ${stockItems}
        WHERE ${stockItems.productId} = ${products.id}
        AND ${stockItems.status} = 'available'
      )`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.ownerId, storeId))
    .orderBy(desc(products.createdAt))

  let filtered = rows
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q))
  }
  if (opts?.status && opts.status !== "all") {
    filtered = filtered.filter((r) => r.status === opts.status)
  }
  if (opts?.categoryId) {
    filtered = filtered.filter((r) => r.categoryId === opts.categoryId)
  }
  return filtered
}

export async function getProduct(id: number) {
  const { storeId } = await requireCapability("products.manage")
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.ownerId, storeId)))
  return row ?? null
}

export async function createProduct(input: ProductInput) {
  const user = await requireCapability("products.manage")
  const [row] = await db
    .insert(products)
    .values({
      ownerId: user.storeId,
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      imageUrl: input.imageUrl ?? null,
      price: String(input.price),
      status: input.status ?? "active",
      deliveryType: input.deliveryType ?? "stock",
      lowStockThreshold: input.lowStockThreshold ?? 5,
      position: input.position ?? 0,
    })
    .returning()
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Criou o produto "${input.name}"`,
    category: "product",
  })
  // Fire "new product" automations (best-effort, never blocks product creation).
  if ((input.status ?? "active") === "active") {
    await runAutomations(user.storeId, "product_created", {
      productName: input.name,
      price: input.price,
    })
  }
  revalidatePath("/products")
  return row
}

export async function updateProduct(id: number, input: ProductInput) {
  const user = await requireCapability("products.manage")
  await db
    .update(products)
    .set({
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      imageUrl: input.imageUrl ?? null,
      price: String(input.price),
      status: input.status ?? "active",
      deliveryType: input.deliveryType ?? "stock",
      lowStockThreshold: input.lowStockThreshold ?? 5,
      position: input.position ?? 0,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, id), eq(products.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Atualizou o produto "${input.name}"`,
    category: "product",
  })
  revalidatePath("/products")
}

export async function setProductStatus(id: number, status: "active" | "inactive") {
  const user = await requireCapability("products.manage")
  await db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `${status === "active" ? "Ativou" : "Desativou"} o produto #${id}`,
    category: "product",
  })
  if (status === "inactive") {
    const [p] = await db
      .select({ name: products.name })
      .from(products)
      .where(and(eq(products.id, id), eq(products.ownerId, user.storeId)))
    await runAutomations(user.storeId, "product_unavailable", {
      productName: p?.name,
    })
  }
  revalidatePath("/products")
}

export async function duplicateProduct(id: number) {
  const user = await requireCapability("products.manage")
  const [original] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.ownerId, user.storeId)))
  if (!original) throw new Error("Produto não encontrado")
  const [row] = await db
    .insert(products)
    .values({
      ownerId: user.storeId,
      name: `${original.name} (cópia)`,
      description: original.description,
      categoryId: original.categoryId,
      imageUrl: original.imageUrl,
      price: original.price,
      status: "inactive",
      deliveryType: original.deliveryType,
      lowStockThreshold: original.lowStockThreshold,
    })
    .returning()
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Duplicou o produto "${original.name}"`,
    category: "product",
  })
  revalidatePath("/products")
  return row
}

export async function deleteProduct(id: number) {
  const user = await requireCapability("products.manage")
  await db
    .delete(stockItems)
    .where(
      and(eq(stockItems.productId, id), eq(stockItems.ownerId, user.storeId)),
    )
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Excluiu o produto #${id}`,
    category: "product",
  })
  revalidatePath("/products")
}

// ---- Categories ----

export async function listCategories() {
  const { storeId } = await requireCapability("products.manage")
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

export async function createCategory(name: string, description?: string) {
  const user = await requireCapability("products.manage")
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const [row] = await db
    .insert(categories)
    .values({ ownerId: user.storeId, name, slug, description: description ?? null })
    .returning()
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Criou a categoria "${name}"`,
    category: "product",
  })
  revalidatePath("/products")
  return row
}

export async function deleteCategory(id: number) {
  const user = await requireCapability("products.manage")
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
  revalidatePath("/products")
}
