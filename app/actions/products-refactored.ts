"use server"

import { db } from "@/lib/db"
import { products, categories, stockItems, orders } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { and, asc, desc, eq, sql, count, sum } from "drizzle-orm"

export type SortOption = 
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock"
  | "updated"
  | "created"
  | "sold-asc"
  | "sold-desc"
  | "status"

export type FilterOption = 
  | "all"
  | "active"
  | "inactive"
  | "no-stock"
  | "low-stock"
  | "auto-delivery"
  | "manual-delivery"

export type ProductWithStats = {
  id: number
  name: string
  description: string | null
  categoryId: number | null
  categoryName: string | null
  categoryEmoji: string | null
  imageUrl: string | null
  price: string
  status: string
  deliveryType: string
  lowStockThreshold: number
  createdAt: Date
  updatedAt: Date
  stockAvailable: number
  stockSold: number
  stockReserved: number
  salesCount: number
}

export type ProductStats = {
  totalProducts: number
  activeProducts: number
  inactiveProducts: number
  noStockProducts: number
  lowStockProducts: number
  averagePrice: string
  totalStockValue: string
  totalInStock: number
}

/**
 * Lista produtos com suporte a ordenação, filtros e busca avançada
 */
export async function listProductsAdvanced(opts?: {
  search?: string
  filters?: FilterOption[]
  sort?: SortOption
  categoryId?: number
}) {
  const { storeId } = await requireCapability("products.manage")

  // Subquery para contar vendas por produto
  const salesSubquery = db
    .select({
      productId: orders.productId,
      count: count().as("count"),
    })
    .from(orders)
    .where(
      and(
        eq(orders.ownerId, storeId),
        eq(orders.paymentStatus, "approved"),
      ),
    )
    .groupBy(orders.productId)
    .as("sales")

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categoryEmoji: categories.emoji,
      imageUrl: products.imageUrl,
      price: products.price,
      status: products.status,
      deliveryType: products.deliveryType,
      lowStockThreshold: products.lowStockThreshold,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      stockAvailable: sql<number>`(
        SELECT COUNT(*)::int FROM ${stockItems}
        WHERE ${stockItems.productId} = ${products.id}
        AND ${stockItems.status} = 'available'
      )`,
      stockSold: sql<number>`(
        SELECT COUNT(*)::int FROM ${stockItems}
        WHERE ${stockItems.productId} = ${products.id}
        AND ${stockItems.status} = 'sold'
      )`,
      stockReserved: sql<number>`(
        SELECT COUNT(*)::int FROM ${stockItems}
        WHERE ${stockItems.productId} = ${products.id}
        AND ${stockItems.status} = 'reserved'
      )`,
      salesCount: sql<number>`COALESCE(${salesSubquery.count}, 0)`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(salesSubquery, eq(products.id, salesSubquery.productId))
    .where(eq(products.ownerId, storeId))

  let filtered = rows as ProductWithStats[]

  // Aplicar busca
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    filtered = filtered.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        p.price.toLowerCase().includes(q)
      )
    })
  }

  // Aplicar filtros
  if (opts?.filters && opts.filters.length > 0) {
    const filterSet = new Set(opts.filters)
    
    filtered = filtered.filter((p) => {
      if (filterSet.has("active") && p.status !== "active") return false
      if (filterSet.has("inactive") && p.status !== "active") return true
      if (filterSet.has("no-stock") && p.deliveryType === "stock" && p.stockAvailable > 0) return false
      if (filterSet.has("low-stock") && !(p.deliveryType === "stock" && p.stockAvailable <= p.lowStockThreshold)) return false
      if (filterSet.has("auto-delivery") && p.deliveryType !== "stock") return false
      if (filterSet.has("manual-delivery") && p.deliveryType !== "manual") return false
      return true
    })
  }

  // Aplicar filtro de categoria
  if (opts?.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === opts.categoryId)
  }

  // Aplicar ordenação
  const sort = opts?.sort ?? "name-asc"
  filtered.sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.name.localeCompare(b.name)
      case "name-desc":
        return b.name.localeCompare(a.name)
      case "price-asc":
        return Number(a.price) - Number(b.price)
      case "price-desc":
        return Number(b.price) - Number(a.price)
      case "stock":
        return b.stockAvailable - a.stockAvailable
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case "created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "sold-asc":
        return a.salesCount - b.salesCount
      case "sold-desc":
        return b.salesCount - a.salesCount
      case "status":
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  return filtered
}

/**
 * Agrupa produtos por categoria
 */
export async function listProductsGroupedByCategory(opts?: {
  search?: string
  filters?: FilterOption[]
  sort?: SortOption
}) {
  const products = await listProductsAdvanced(opts)

  const grouped = new Map<
    number | null,
    {
      categoryId: number | null
      categoryName: string | null
      categoryEmoji: string | null
      products: ProductWithStats[]
    }
  >()

  for (const product of products) {
    const key = product.categoryId ?? null
    if (!grouped.has(key)) {
      grouped.set(key, {
        categoryId: key,
        categoryName: product.categoryName,
        categoryEmoji: product.categoryEmoji,
        products: [],
      })
    }
    grouped.get(key)!.products.push(product)
  }

  return Array.from(grouped.values()).sort((a, b) => {
    // Sem categoria sempre por último
    if (a.categoryId === null) return 1
    if (b.categoryId === null) return -1
    return (a.categoryName ?? "").localeCompare(b.categoryName ?? "")
  })
}

/**
 * Calcula estatísticas dos produtos
 */
/**
 * Lista todas as categorias (Re-exportado para compatibilidade)
 */
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

export async function getProductStats(): Promise<ProductStats> {
  const { storeId } = await requireCapability("products.manage")

  const allProducts = await db
    .select({
      id: products.id,
      status: products.status,
      deliveryType: products.deliveryType,
      price: products.price,
      lowStockThreshold: products.lowStockThreshold,
      stockAvailable: sql<number>`(
        SELECT COUNT(*)::int FROM ${stockItems}
        WHERE ${stockItems.productId} = ${products.id}
        AND ${stockItems.status} = 'available'
      )`,
    })
    .from(products)
    .where(eq(products.ownerId, storeId))

  const totalProducts = allProducts.length
  const activeProducts = allProducts.filter((p) => p.status === "active").length
  const inactiveProducts = totalProducts - activeProducts
  const noStockProducts = allProducts.filter(
    (p) => p.deliveryType === "stock" && p.stockAvailable === 0,
  ).length
  const lowStockProducts = allProducts.filter(
    (p) => p.deliveryType === "stock" && p.stockAvailable > 0 && p.stockAvailable <= p.lowStockThreshold,
  ).length

  const totalPrice = allProducts.reduce((sum, p) => sum + Number(p.price), 0)
  const averagePrice = totalProducts > 0 ? (totalPrice / totalProducts).toFixed(2) : "0.00"

  const totalStockValue = allProducts.reduce(
    (sum, p) => sum + Number(p.price) * p.stockAvailable,
    0,
  ).toFixed(2)

  const totalInStock = allProducts.reduce((sum, p) => sum + p.stockAvailable, 0)

  return {
    totalProducts,
    activeProducts,
    inactiveProducts,
    noStockProducts,
    lowStockProducts,
    averagePrice,
    totalStockValue,
    totalInStock,
  }
}
