"use server"

import { db } from "@/lib/db"
import { products, categories, stockItems } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { and, desc, eq, sql } from "drizzle-orm"
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
}

export async function listProducts(opts?: {
  search?: string
  status?: string
  categoryId?: number
}) {
  await requireCapability("products.manage")

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
      createdAt: products.createdAt,
      stockAvailable: sql<number>`(
        SELECT COUNT(*)::int FROM ${stockItems}
        WHERE ${stockItems.productId} = ${products.id}
        AND ${stockItems.status} = 'available'
      )`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
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
  await requireCapability("products.manage")
  const [row] = await db.select().from(products).where(eq(products.id, id))
  return row ?? null
}

export async function createProduct(input: ProductInput) {
  const user = await requireCapability("products.manage")
  const [row] = await db
    .insert(products)
    .values({
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      imageUrl: input.imageUrl ?? null,
      price: String(input.price),
      status: input.status ?? "active",
      deliveryType: input.deliveryType ?? "stock",
      lowStockThreshold: input.lowStockThreshold ?? 5,
    })
    .returning()
  await logActivity({
    actor: user,
    action: `Criou o produto "${input.name}"`,
    category: "product",
  })
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
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
  await logActivity({
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
    .where(eq(products.id, id))
  await logActivity({
    actor: user,
    action: `${status === "active" ? "Ativou" : "Desativou"} o produto #${id}`,
    category: "product",
  })
  revalidatePath("/products")
}

export async function duplicateProduct(id: number) {
  const user = await requireCapability("products.manage")
  const [original] = await db.select().from(products).where(eq(products.id, id))
  if (!original) throw new Error("Produto não encontrado")
  const [row] = await db
    .insert(products)
    .values({
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
    actor: user,
    action: `Duplicou o produto "${original.name}"`,
    category: "product",
  })
  revalidatePath("/products")
  return row
}

export async function deleteProduct(id: number) {
  const user = await requireCapability("products.manage")
  await db.delete(stockItems).where(eq(stockItems.productId, id))
  await db.delete(products).where(eq(products.id, id))
  await logActivity({
    actor: user,
    action: `Excluiu o produto #${id}`,
    category: "product",
  })
  revalidatePath("/products")
}

// ---- Categories ----

export async function listCategories() {
  await requireCapability("products.manage")
  return db.select().from(categories).orderBy(desc(categories.createdAt))
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
    .values({ name, slug, description: description ?? null })
    .returning()
  await logActivity({
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
    .where(eq(products.categoryId, id))
  await db.delete(categories).where(eq(categories.id, id))
  await logActivity({
    actor: user,
    action: `Excluiu a categoria #${id}`,
    category: "product",
  })
  revalidatePath("/products")
}
