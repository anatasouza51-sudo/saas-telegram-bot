import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import {
  getDashboardPeriodChart,
  getDashboardPeriodOrders,
  getDashboardPeriodStats,
  isDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/queries/dashboard-period"

export async function GET(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedPeriod = searchParams.get("period")
    const period: DashboardPeriod = isDashboardPeriod(requestedPeriod) ? requestedPeriod : "today"

    // Usamos Promise.allSettled para que uma falha em uma query específica
    // não derrube todo o carregamento do dashboard.
    const [statsResult, recentOrdersResult, salesDataResult] = await Promise.allSettled([
      getDashboardPeriodStats(user.storeId, period),
      getDashboardPeriodOrders(user.storeId, 5, period),
      getDashboardPeriodChart(user.storeId, period),
    ])

    const stats = statsResult.status === "fulfilled" ? statsResult.value : {
      totalRevenue: 0,
      totalSales: 0,
      salesToday: 0,
      conversionRate: 0,
      pendingPayments: 0,
      approvedPayments: 0,
      refusedPayments: 0,
      totalCustomers: 0,
      totalProducts: 0,
      lowStockCount: 0,
    }

    const recentOrders = recentOrdersResult.status === "fulfilled" ? recentOrdersResult.value : []
    const salesData = salesDataResult.status === "fulfilled" ? salesDataResult.value : []

    // Log de avisos para facilitar debug se alguma query falhar silenciosamente
    if (statsResult.status === "rejected") console.error("[Dashboard API] Stats query failed:", statsResult.reason)
    if (recentOrdersResult.status === "rejected") console.error("[Dashboard API] Recent orders query failed:", recentOrdersResult.reason)
    if (salesDataResult.status === "rejected") console.error("[Dashboard API] Sales chart query failed:", salesDataResult.reason)

    return NextResponse.json({
      period,
      stats,
      recentOrders,
      salesData,
    })
  } catch (error) {
    console.error("[Dashboard API] Global failure:", error)
    return NextResponse.json({
      error: "Erro interno ao processar dados do dashboard",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    }, { status: 500 })
  }
}
