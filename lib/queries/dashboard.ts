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

  // Combined order stats query to reduce roundtrips
  const [orderStats, customersCount, productsCount, lowStockCountResult] = await Promise.all([
    db
      .select({
        totalRevenue: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'approved' then ${orders.amount} else 0 end), 0)::float`,
        totalSales: sql<number>`count(case when ${orders.paymentStatus} = 'approved' then 1 end)::int`,
        salesToday: sql<number>`count(case when ${orders.paymentStatus} = 'approved' and ${orders.createdAt} >= ${startOfToday} then 1 end)::int`,
        pendingPayments: sql<number>`count(case when ${orders.paymentStatus} = 'pending' then 1 end)::int`,
        approvedPayments: sql<number>`count(case when ${orders.paymentStatus} = 'approved' then 1 end)::int`,
        refusedPayments: sql<number>`count(case when ${orders.paymentStatus} = 'refused' then 1 end)::int`,
      })
      .from(orders)
      .where(eq(orders.ownerId, storeId)),
    
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.ownerId, storeId)),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.ownerId, storeId)),
    
    // Optimized low stock count in a single subquery if possible, or keep filtered logic
    db.select({
      count: sql<number>`count(*)::int`
    })
    .from(
      db.select({
        id: products.id,
      })
      .from(products)
      .leftJoin(stockItems, eq(stockItems.productId, products.id))
      .where(
        and(
          eq(products.ownerId, storeId),
          eq(products.status, "active"),
          eq(products.deliveryType, "stock")
        )
      )
      .groupBy(products.id, products.lowStockThreshold)
      .having(sql`count(${stockItems.id}) filter (where ${stockItems.status} = 'available') <= ${products.lowStockThreshold}`)
      .as('low_stock_products')
    )
  ])

  const stats = orderStats[0]
  const totalOrders = (stats?.pendingPayments ?? 0) + (stats?.approvedPayments ?? 0) + (stats?.refusedPayments ?? 0)
  const approved = stats?.approvedPayments ?? 0
  const conversionRate = totalOrders > 0 ? (approved / totalOrders) * 100 : 0

  return {
    totalRevenue: Number(stats?.totalRevenue ?? 0),
    totalSales: stats?.totalSales ?? 0,
    salesToday: stats?.salesToday ?? 0,
    pendingPayments: stats?.pendingPayments ?? 0,
    approvedPayments: approved,
    refusedPayments: stats?.refusedPayments ?? 0,
    totalCustomers: customersCount[0]?.count ?? 0,
    totalProducts: productsCount[0]?.count ?? 0,
    lowStockCount: lowStockCountResult[0]?.count ?? 0,
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
