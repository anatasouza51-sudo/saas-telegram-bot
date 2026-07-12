"use server"

import { db } from "@/lib/db"
import { stockItems, products } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { runAutomations } from "@/lib/tg/automations"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function listStockSummary() {
  const { storeId } = await requireCapability("stock.manage")
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      deliveryType: products.deliveryType,
      lowStockThreshold: products.lowStockThreshold,
      available: sql<number>`COUNT(*) FILTER (WHERE ${stockItems.status} = 'available')::int`,
      sold: sql<number>`COUNT(*) FILTER (WHERE ${stockItems.status} = 'sold')::int`,
      reserved: sql<number>`COUNT(*) FILTER (WHERE ${stockItems.status} = 'reserved')::int`,
    })
    .from(products)
    .leftJoin(stockItems, eq(stockItems.productId, products.id))
    .where(eq(products.ownerId, storeId))
    .groupBy(products.id)
    .orderBy(desc(products.createdAt))
  return rows
}

export async function listStockItems(productId: number, status?: string) {
  const { storeId } = await requireCapability("stock.manage")
  const conditions = [
    eq(stockItems.productId, productId),
    eq(stockItems.ownerId, storeId),
  ]
  if (status && status !== "all") {
    conditions.push(eq(stockItems.status, status))
  }
  return db
    .select()
    .from(stockItems)
    .where(and(...conditions))
    .orderBy(desc(stockItems.createdAt))
}

async function assertOwnsProduct(productId: number, storeId: string) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.ownerId, storeId)))
  if (!product) throw new Error("Produto não encontrado")
}

export async function addStockItems(productId: number, raw: string) {
  const user = await requireCapability("stock.manage")
  await assertOwnsProduct(productId, user.storeId)
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) throw new Error("Nenhum item informado")

  // Snapshot availability before insert so we can detect a true "restock"
  // (went from zero to having stock again).
  const [before] = await db
    .select({
      available: sql<number>`COUNT(*) FILTER (WHERE ${stockItems.status} = 'available')::int`,
    })
    .from(stockItems)
    .where(
      and(
        eq(stockItems.productId, productId),
        eq(stockItems.ownerId, user.storeId),
      ),
    )

  await db.insert(stockItems).values(
    lines.map((content) => ({
      ownerId: user.storeId,
      productId,
      content,
      status: "available" as const,
    })),
  )

  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Adicionou ${lines.length} item(ns) de estoque ao produto #${productId}`,
    category: "stock",
  })

  if ((before?.available ?? 0) === 0) {
    const [p] = await db
      .select({ name: products.name })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.ownerId, user.storeId)))
    await runAutomations(user.storeId, "stock_restocked", {
      productName: p?.name,
      stock: lines.length,
    })
  }

  revalidatePath("/stock")
  return lines.length
}

export async function deleteStockItem(id: number) {
  const user = await requireCapability("stock.manage")
  const [item] = await db
    .select()
    .from(stockItems)
    .where(and(eq(stockItems.id, id), eq(stockItems.ownerId, user.storeId)))
  if (!item) throw new Error("Item não encontrado")
  if (item.status === "sold") {
    throw new Error("Não é possível remover um item já vendido")
  }
  await db
    .delete(stockItems)
    .where(and(eq(stockItems.id, id), eq(stockItems.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Removeu o item de estoque #${id}`,
    category: "stock",
  })
  revalidatePath("/stock")
}

export async function clearAvailableStock(productId: number) {
  const user = await requireCapability("stock.manage")
  await db
    .delete(stockItems)
    .where(
      and(
        eq(stockItems.productId, productId),
        eq(stockItems.ownerId, user.storeId),
        eq(stockItems.status, "available"),
      ),
    )
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Limpou o estoque disponível do produto #${productId}`,
    category: "stock",
  })
  revalidatePath("/stock")
}

export async function exportStock(productId: number, status = "available") {
  const { storeId } = await requireCapability("stock.manage")
  const items = await db
    .select({ content: stockItems.content })
    .from(stockItems)
    .where(
      and(
        eq(stockItems.productId, productId),
        eq(stockItems.ownerId, storeId),
        eq(stockItems.status, status),
      ),
    )
  return items.map((i) => i.content).join("\n")
}
