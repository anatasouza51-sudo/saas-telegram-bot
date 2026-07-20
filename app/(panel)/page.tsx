import { requireUser } from "@/lib/session"
export const dynamic = "force-dynamic"
import {
  getDashboardStats,
  getRecentOrders,
  getSalesChart,
} from "@/lib/queries/dashboard"

export default async function DashboardPage() {
  const user = await requireUser()
  
  let stats: any = {
    totalRevenue: 0, totalSales: 0, salesToday: 0, conversionRate: 0,
    pendingPayments: 0, approvedPayments: 0, refusedPayments: 0,
    totalCustomers: 0, totalProducts: 0, lowStockCount: 0
  }
  let recentOrders: any[] = []
  let salesData: any[] = []

  try {
    const [fetchedStats, fetchedOrders, fetchedChart] = await Promise.all([
      getDashboardStats(user.storeId).catch(() => null),
      getRecentOrders(user.storeId).catch(() => []),
      getSalesChart(user.storeId, 14).catch(() => []),
    ])
    if (fetchedStats) stats = fetchedStats
    if (fetchedOrders) recentOrders = fetchedOrders
    if (fetchedChart) salesData = fetchedChart
  } catch (e) {
    console.error("Error loading dashboard data:", e)
  }

  return (
    <div>
      <h1>Dashboard - {user.name}</h1>
      <p>Revenue: {stats.totalRevenue}</p>
      <p>Sales: {stats.totalSales}</p>
      <p>Orders: {recentOrders.length}</p>
      <p>Chart data: {salesData.length}</p>
    </div>
  )
}
