import "server-only"
import { db } from "@/lib/db"
import { orders, products, customers, stockItems } from "@/lib/db/schema"
import { and, desc, eq, gte, sql } from "drizzle-orm"

export type DashboardStats = {
  totalRevenue: number
  totalSales: number
  salesToday: number
  pendingPayments: number
  approvedPayments: number
  refusedPayments: number
  totalCustomers: number
  totalProducts: number
  lowStockCount: number
  conversionRate: number
}

export async function getDashboardStats(
  storeId: string,
): Promise<DashboardStats> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    revenueRow,
    salesRow,
    salesTodayRow,
    pendingRow,
    approvedRow,
    refusedRow,
    customersRow,
    productsRow,
  ] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${orders.amount}), 0)::float` })
      .from(orders)
      .where(
        and(eq(orders.ownerId, storeId), eq(orders.paymentStatus, "approved")),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(eq(orders.ownerId, storeId), eq(orders.paymentStatus, "approved")),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.ownerId, storeId),
          eq(orders.paymentStatus, "approved"),
          gte(orders.createdAt, startOfToday),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(eq(orders.ownerId, storeId), eq(orders.paymentStatus, "pending")),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(eq(orders.ownerId, storeId), eq(orders.paymentStatus, "approved")),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(eq(orders.ownerId, storeId), eq(orders.paymentStatus, "refused")),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(eq(customers.ownerId, storeId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.ownerId, storeId)),
  ])

  // Low stock: products with fewer available stock items than their threshold
  const lowStock = await db
    .select({
      productId: products.id,
      threshold: products.lowStockThreshold,
      available: sql<number>`count(${stockItems.id}) filter (where ${stockItems.status} = 'available')::int`,
    })
    .from(products)
    .leftJoin(stockItems, eq(stockItems.productId, products.id))
    .where(
      and(
        eq(products.ownerId, storeId),
        eq(products.status, "active"),
        eq(products.deliveryType, "stock"),
      ),
    )
    .groupBy(products.id, products.lowStockThreshold)

  const lowStockCount = lowStock.filter(
    (p) => Number(p.available) <= Number(p.threshold),
  ).length

  const totalOrders =
    (pendingRow[0]?.count ?? 0) +
    (approvedRow[0]?.count ?? 0) +
    (refusedRow[0]?.count ?? 0)
  const approved = approvedRow[0]?.count ?? 0
  const conversionRate = totalOrders > 0 ? (approved / totalOrders) * 100 : 0

  return {
    totalRevenue: Number(revenueRow[0]?.total ?? 0),
    totalSales: salesRow[0]?.count ?? 0,
    salesToday: salesTodayRow[0]?.count ?? 0,
    pendingPayments: pendingRow[0]?.count ?? 0,
    approvedPayments: approved,
    refusedPayments: refusedRow[0]?.count ?? 0,
    totalCustomers: customersRow[0]?.count ?? 0,
    totalProducts: productsRow[0]?.count ?? 0,
    lowStockCount,
    conversionRate,
  }
}

export async function getRecentOrders(storeId: string, limit = 8) {
  return db
    .select({
      id: orders.id,
      productName: orders.productName,
      amount: orders.amount,
      paymentStatus: orders.paymentStatus,
      deliveryStatus: orders.deliveryStatus,
      createdAt: orders.createdAt,
      customerName: customers.name,
      customerUsername: customers.username,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.ownerId, storeId))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
}

export type SalesPoint = { date: string; revenue: number; sales: number }

export async function getSalesChart(
  storeId: string,
  days = 14,
): Promise<SalesPoint[]> {
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.amount}), 0)::float`,
      sales: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.ownerId, storeId),
        eq(orders.paymentStatus, "approved"),
        gte(orders.createdAt, start),
      ),
    )
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`)

  const map = new Map(rows.map((r) => [r.day, r]))
  const result: SalesPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const row = map.get(key)
    result.push({
      date: key,
      revenue: Number(row?.revenue ?? 0),
      sales: Number(row?.sales ?? 0),
    })
  }
  return result
}
