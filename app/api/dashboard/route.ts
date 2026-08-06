import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import {
  getDashboardStats,
  getRecentOrders,
  getSalesChart,
} from "@/lib/queries/dashboard"

export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Usamos Promise.allSettled para que uma falha em uma query específica 
    // não derrube todo o carregamento do dashboard.
    const [statsResult, recentOrdersResult, salesDataResult] = await Promise.allSettled([
      getDashboardStats(user.storeId),
      getRecentOrders(user.storeId),
      getSalesChart(user.storeId, 14)
    ])

    const stats = statsResult.status === 'fulfilled' ? statsResult.value : {
      totalRevenue: 0, 
      totalSales: 0, 
      salesToday: 0, 
      conversionRate: 0,
      pendingPayments: 0, 
      approvedPayments: 0, 
      refusedPayments: 0,
      totalCustomers: 0, 
      totalProducts: 0, 
      lowStockCount: 0
    }
    
    const recentOrders = recentOrdersResult.status === 'fulfilled' ? recentOrdersResult.value : []
    const salesData = salesDataResult.status === 'fulfilled' ? salesDataResult.value : []

    // Log de avisos para facilitar debug se alguma query falhar silenciosamente
    if (statsResult.status === 'rejected') console.error("[Dashboard API] Stats query failed:", statsResult.reason)
    if (recentOrdersResult.status === 'rejected') console.error("[Dashboard API] Recent orders query failed:", recentOrdersResult.reason)
    if (salesDataResult.status === 'rejected') console.error("[Dashboard API] Sales chart query failed:", salesDataResult.reason)

    return NextResponse.json({
      user,
      stats,
      recentOrders,
      salesData
    })
  } catch (error) {
    console.error("[Dashboard API] Global failure:", error)
    return NextResponse.json({ 
      error: "Erro interno ao processar dados do dashboard",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
}
