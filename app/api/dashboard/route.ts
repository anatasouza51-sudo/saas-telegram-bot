import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import {
  getDashboardStats,
  getRecentOrders,
  getSalesChart,
} from "@/lib/queries/dashboard"

export async function GET() {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [statsResult, recentOrdersResult, salesDataResult] = await Promise.allSettled([
    getDashboardStats(user.storeId),
    getRecentOrders(user.storeId),
    getSalesChart(user.storeId, 14)
  ])

  const stats = statsResult.status === 'fulfilled' ? statsResult.value : {
    totalRevenue: 0, totalSales: 0, salesToday: 0, conversionRate: 0,
    pendingPayments: 0, approvedPayments: 0, refusedPayments: 0,
    totalCustomers: 0, totalProducts: 0, lowStockCount: 0
  }
  const recentOrders = recentOrdersResult.status === 'fulfilled' ? recentOrdersResult.value : []
  const salesData = salesDataResult.status === 'fulfilled' ? salesDataResult.value : []

  return NextResponse.json({
    user,
    stats,
    recentOrders,
    salesData
  })
}
