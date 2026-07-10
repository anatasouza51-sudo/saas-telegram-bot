"use server"

import { db } from "@/lib/db"
import { stockItems, products } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function listStockSummary() {
  await requireCapability("stock.manage")
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
    .groupBy(products.id)
    .orderBy(desc(products.createdAt))
  return rows
}

export async function listStockItems(productId: number, status?: string) {
  await requireCapability("stock.manage")
  const conditions = [eq(stockItems.productId, productId)]
  if (status && status !== "all") {
    conditions.push(eq(stockItems.status, status))
  }
  return db
    .select()
    .from(stockItems)
    .where(and(...conditions))
    .orderBy(desc(stockItems.createdAt))
}

export async function addStockItems(productId: number, raw: string) {
  const user = await requireCapability("stock.manage")
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) throw new Error("Nenhum item informado")

  await db.insert(stockItems).values(
    lines.map((content) => ({
      productId,
      content,
      status: "available" as const,
    })),
  )

  await logActivity({
    actor: user,
    action: `Adicionou ${lines.length} item(ns) de estoque ao produto #${productId}`,
    category: "stock",
  })
  revalidatePath("/stock")
  return lines.length
}

export async function deleteStockItem(id: number) {
  const user = await requireCapability("stock.manage")
  const [item] = await db.select().from(stockItems).where(eq(stockItems.id, id))
  if (item?.status === "sold") {
    throw new Error("Não é possível remover um item já vendido")
  }
  await db.delete(stockItems).where(eq(stockItems.id, id))
  await logActivity({
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
      and(eq(stockItems.productId, productId), eq(stockItems.status, "available")),
    )
  await logActivity({
    actor: user,
    action: `Limpou o estoque disponível do produto #${productId}`,
    category: "stock",
  })
  revalidatePath("/stock")
}

export async function exportStock(productId: number, status = "available") {
  await requireCapability("stock.manage")
  const items = await db
    .select({ content: stockItems.content })
    .from(stockItems)
    .where(and(eq(stockItems.productId, productId), eq(stockItems.status, status)))
  return items.map((i) => i.content).join("\n")
}
