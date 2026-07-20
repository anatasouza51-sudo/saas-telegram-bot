import { requireUser } from "@/lib/session"
export const dynamic = "force-dynamic"
import { MetricCard } from "@/components/metric-card"
import { SalesChart } from "@/components/sales-chart"
import { CheckoutFunnel } from "@/components/checkout-funnel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  PaymentStatusBadge,
  DeliveryStatusBadge,
} from "@/components/status-badge"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import {
  getDashboardStats,
  getRecentOrders,
  getSalesChart,
} from "@/lib/queries/dashboard"

export default async function DashboardPage() {
  const user = await requireUser()

  // Parallel data fetching for instant loading
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

  const totalCheckouts = (stats?.pendingPayments || 0) + (stats?.approvedPayments || 0) + (stats?.refusedPayments || 0)
  const approvedSales = stats?.approvedPayments || 0
  const totalConversion = totalCheckouts > 0 ? (approvedSales / totalCheckouts) * 100 : 0
  const funnelStages = [
    { label: "Checkouts Totais", value: totalCheckouts, percentage: 100 },
    { label: "Pagamentos Aprovados", value: approvedSales, percentage: totalConversion },
  ]

  return (
    <div className="pt-4 pb-8 px-3 sm:px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
          Bem-vindo, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.name || "Operador"}</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Seu desempenho real em tempo real</p>
      </div>

      {/* Top Metrics Grid — 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 sm:mb-8">
        <MetricCard title="Receita Total" value={formatCurrency(stats?.totalRevenue || 0)} iconName="dollar" color="blue" />
        <MetricCard title="Total de Vendas" value={formatNumber(stats?.totalSales || 0)} iconName="shopping" color="purple" />
        <MetricCard title="Taxa de Conversão" value={`${(stats?.conversionRate || 0).toFixed(1)}%`} iconName="trendingUp" color="green" />
        <MetricCard title="Clientes Ativos" value={formatNumber(stats?.totalCustomers || 0)} iconName="users" color="yellow" />
      </div>

      {/* Charts Section — Stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <Card className="relative overflow-hidden border-0 bg-blue-950/20 shadow-2xl h-full">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Vendas dos Últimos 14 Dias</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Faturamento real por dia</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {salesData && salesData.length > 0 ? (
                <SalesChart data={salesData} />
              ) : (
                <div className="h-48 sm:h-[300px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                  Aguardando primeiros dados de vendas...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <CheckoutFunnel stages={funnelStages} totalConversion={totalConversion} />
        </div>
      </div>

      {/* Secondary Metrics Grid — 2 col mobile, 3 col tablet, 6 col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
        <MetricCard title="Produtos" value={formatNumber(stats?.totalProducts || 0)} iconName="package" color="blue" />
        <MetricCard title="Estoque Baixo" value={formatNumber(stats?.lowStockCount || 0)} iconName="alert" color={(stats?.lowStockCount || 0) > 0 ? "red" : "green"} />
        <MetricCard title="Aprovados" value={formatNumber(stats?.approvedPayments || 0)} iconName="check" color="green" />
        <MetricCard title="Pendentes" value={formatNumber(stats?.pendingPayments || 0)} iconName="zap" color="yellow" />
        <MetricCard title="Recusados" value={formatNumber(stats?.refusedPayments || 0)} iconName="alert" color="red" />
        <MetricCard title="Vendas Hoje" value={formatNumber(stats?.salesToday || 0)} iconName="trendingUp" color="purple" />
      </div>

      {/* Recent Orders Section */}
      <Card className="relative overflow-hidden border-0 bg-blue-950/20 shadow-2xl">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Últimos Pedidos</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Histórico real de vendas via Telegram</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {!recentOrders || recentOrders.length === 0 ? (
            <p className="px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
              Nenhum pedido registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-blue-500/10 hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-[10px] sm:text-xs">#</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] sm:text-xs">Cliente</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] sm:text-xs hidden sm:table-cell">Produto</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] sm:text-xs">Valor</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] sm:text-xs">Pagamento</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] sm:text-xs hidden md:table-cell">Entrega</TableHead>
                    <TableHead className="text-right text-muted-foreground text-[10px] sm:text-xs">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow
                      key={o.id}
                      className="border-blue-500/10 hover:bg-blue-500/5 transition-colors duration-200"
                    >
                      <TableCell className="font-mono text-[9px] sm:text-xs text-muted-foreground p-2 sm:p-4">{o.id}</TableCell>
                      <TableCell className="text-white text-[9px] sm:text-xs p-2 sm:p-4">{o.customerName || (o.customerUsername ? `@${o.customerUsername}` : "—")}</TableCell>
                      <TableCell className="max-w-[120px] sm:max-w-[200px] truncate text-muted-foreground text-[9px] sm:text-xs p-2 sm:p-4 hidden sm:table-cell">{o.productName || "—"}</TableCell>
                      <TableCell className="font-medium text-white text-[9px] sm:text-xs p-2 sm:p-4 whitespace-nowrap">{formatCurrency(o.amount || 0)}</TableCell>
                      <TableCell className="p-2 sm:p-4"><PaymentStatusBadge status={o.paymentStatus} /></TableCell>
                      <TableCell className="p-2 sm:p-4 hidden md:table-cell"><DeliveryStatusBadge status={o.deliveryStatus} /></TableCell>
                      <TableCell className="text-right text-[9px] sm:text-xs text-muted-foreground p-2 sm:p-4 whitespace-nowrap">{formatDateTime(o.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
