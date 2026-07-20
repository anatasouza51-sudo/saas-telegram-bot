import { requireUser } from "@/lib/session"
export const dynamic = "force-dynamic"
import { MetricCard } from "@/components/metric-card"
import {
  getDashboardStats,
  getRecentOrders,
  getSalesChart,
} from "@/lib/queries/dashboard"
import {
  DollarSign, ShoppingCart, TrendingUp, Users
} from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/format"

export default async function DashboardPage() {
  const user = await requireUser()
  
  let stats: any = {
    totalRevenue: 0, totalSales: 0, salesToday: 0, conversionRate: 0,
    pendingPayments: 0, approvedPayments: 0, refusedPayments: 0,
    totalCustomers: 0, totalProducts: 0, lowStockCount: 0
  }

  try {
    const fetchedStats = await getDashboardStats(user.storeId).catch(() => null)
    if (fetchedStats) stats = fetchedStats
  } catch (e) {
    console.error("Error loading dashboard data:", e)
  }

  return (
    <div>
      <h1>Dashboard - {user.name}</h1>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard title="Receita Total" value={formatCurrency(stats?.totalRevenue || 0)} icon={DollarSign} color="blue" />
        <MetricCard title="Total de Vendas" value={formatNumber(stats?.totalSales || 0)} icon={ShoppingCart} color="purple" />
        <MetricCard title="Taxa de Conversão" value={`${(stats?.conversionRate || 0).toFixed(1)}%`} icon={TrendingUp} color="green" />
        <MetricCard title="Clientes Ativos" value={formatNumber(stats?.totalCustomers || 0)} icon={Users} color="yellow" />
      </div>
    </div>
  )
}
