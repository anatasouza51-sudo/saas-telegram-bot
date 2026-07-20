import { getSessionUser } from "@/lib/session"
import { getDashboardStats, getRecentOrders, getSalesChart } from "@/lib/queries/dashboard"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "No session" }, { status: 401 })
    }

    // Test dashboard queries
    let statsResult: any = null
    try {
      statsResult = await getDashboardStats(user.storeId)
    } catch (e: any) {
      statsResult = { error: String(e?.message || e), stack: e?.stack?.split("\n").slice(0, 3) }
    }

    let ordersResult: any = null
    try {
      ordersResult = await getRecentOrders(user.storeId)
    } catch (e: any) {
      ordersResult = { error: String(e?.message || e), stack: e?.stack?.split("\n").slice(0, 3) }
    }

    let chartResult: any = null
    try {
      chartResult = await getSalesChart(user.storeId, 14)
    } catch (e: any) {
      chartResult = { error: String(e?.message || e), stack: e?.stack?.split("\n").slice(0, 3) }
    }

    return NextResponse.json({
      user: { name: user.name, storeId: user.storeId },
      stats: statsResult,
      orders: Array.isArray(ordersResult) ? `length: ${ordersResult.length}` : ordersResult,
      chart: Array.isArray(chartResult) ? `length: ${chartResult.length}` : chartResult,
    })
  } catch (e: any) {
    return NextResponse.json({
      error: String(e?.message || e),
      stack: e?.stack?.split("\n").slice(0, 5),
    }, { status: 500 })
  }
}
