import "server-only"
import { withTenantTx } from "@/lib/db/tenant-tx"
import { orders, products, customers, stockItems } from "@/lib/db/schema"
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm"
import type { DashboardStats, SalesPoint } from "@/lib/queries/dashboard"

export type DashboardPeriod = "today" | "yesterday" | "7d" | "30d" | "total"

export function isDashboardPeriod(value: string | null | undefined): value is DashboardPeriod {
  return value === "today" || value === "yesterday" || value === "7d" || value === "30d" || value === "total"
}

export function getDashboardPeriodBounds(period: DashboardPeriod): { start?: Date; end?: Date } {
  if (period === "total") return {}

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  if (period === "yesterday") {
    const start = new Date(startOfToday)
    start.setDate(start.getDate() - 1)
    return { start, end: startOfToday }
  }

  const start = new Date(startOfToday)
  const days = period === "today" ? 1 : period === "7d" ? 7 : 30
  start.setDate(start.getDate() - (days - 1))

  const end = new Date(startOfToday)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export async function getDashboardPeriodStats(
  storeId: string,
  period: DashboardPeriod,
): Promise<DashboardStats> {
  const { start, end } = getDashboardPeriodBounds(period)

  const { orderStats, todayStats, customersCount, productsCount, lowStockCountResult } =
    await withTenantTx(storeId, async (tx) => {
      const periodConditions = [eq(orders.ownerId, storeId)]
      if (start) periodConditions.push(gte(orders.createdAt, start))
      if (end) periodConditions.push(lt(orders.createdAt, end))

      const orderStats = await tx
        .select({
          totalRevenue: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'approved' then ${orders.amount} else 0 end), 0)::float`,
          totalSales: sql<number>`count(case when ${orders.paymentStatus} = 'approved' then 1 end)::int`,
          pendingPayments: sql<number>`count(case when ${orders.paymentStatus} = 'pending' then 1 end)::int`,
          approvedPayments: sql<number>`count(case when ${orders.paymentStatus} = 'approved' then 1 end)::int`,
          refusedPayments: sql<number>`count(case when ${orders.paymentStatus} = 'refused' then 1 end)::int`,
        })
        .from(orders)
        .where(and(...periodConditions))

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date(startOfToday)
      endOfToday.setDate(endOfToday.getDate() + 1)
      const todayStats = await tx
        .select({ salesToday: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            eq(orders.ownerId, storeId),
            eq(orders.paymentStatus, "approved"),
            gte(orders.createdAt, startOfToday),
            lt(orders.createdAt, endOfToday),
          ),
        )

      const customersCount = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(eq(customers.ownerId, storeId))
      const productsCount = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(eq(products.ownerId, storeId))
      const lowStockCountResult = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(
          tx
            .select({ id: products.id })
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
            .having(
              sql`count(${stockItems.id}) filter (where ${stockItems.status} = 'available') <= ${products.lowStockThreshold}`,
            )
            .as("low_stock_products"),
        )
      return { orderStats, todayStats, customersCount, productsCount, lowStockCountResult }
    })

  const stats = orderStats[0]
  const totalOrders = (stats?.pendingPayments ?? 0) + (stats?.approvedPayments ?? 0) + (stats?.refusedPayments ?? 0)
  const approved = stats?.approvedPayments ?? 0
  const conversionRate = totalOrders > 0 ? (approved / totalOrders) * 100 : 0

  return {
    totalRevenue: Number(stats?.totalRevenue ?? 0),
    totalSales: stats?.totalSales ?? 0,
    salesToday: todayStats[0]?.salesToday ?? 0,
    pendingPayments: stats?.pendingPayments ?? 0,
    approvedPayments: approved,
    refusedPayments: stats?.refusedPayments ?? 0,
    totalCustomers: customersCount[0]?.count ?? 0,
    totalProducts: productsCount[0]?.count ?? 0,
    lowStockCount: lowStockCountResult[0]?.count ?? 0,
    conversionRate,
  }
}

export async function getDashboardPeriodOrders(
  storeId: string,
  limit = 8,
  period: DashboardPeriod,
) {
  const { start, end } = getDashboardPeriodBounds(period)
  const conditions = [eq(orders.ownerId, storeId)]
  if (start) conditions.push(gte(orders.createdAt, start))
  if (end) conditions.push(lt(orders.createdAt, end))

  return withTenantTx(storeId, (tx) => tx
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
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit))
}

export async function getDashboardPeriodChart(
  storeId: string,
  period: DashboardPeriod,
): Promise<SalesPoint[]> {
  const { start, end } = getDashboardPeriodBounds(period)
  const conditions = [eq(orders.ownerId, storeId), eq(orders.paymentStatus, "approved")]
  if (start) conditions.push(gte(orders.createdAt, start))
  if (end) conditions.push(lt(orders.createdAt, end))

  const rows = await withTenantTx(storeId, (tx) => tx
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.amount}), 0)::float`,
      sales: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
    .orderBy(asc(sql`date_trunc('day', ${orders.createdAt})`)))

  if (period === "total" || !start) {
    return rows.map((row) => ({
      date: row.day,
      revenue: Number(row.revenue ?? 0),
      sales: Number(row.sales ?? 0),
    }))
  }

  const days = period === "today" || period === "yesterday" ? 1 : period === "7d" ? 7 : 30
  const map = new Map(rows.map((row) => [row.day, row]))
  const result: SalesPoint[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = date.toISOString().slice(0, 10)
    const row = map.get(key)
    result.push({
      date: key,
      revenue: Number(row?.revenue ?? 0),
      sales: Number(row?.sales ?? 0),
    })
  }
  return result
}
