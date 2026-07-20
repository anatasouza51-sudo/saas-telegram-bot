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
    <div className="pt-6 pb-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto min-h-screen">
      {/* Header - Revertido para o tamanho que o usuário gostou antes */}
      <div className="mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 leading-tight tracking-tighter">
          Bem-vindo, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.name || "Operador"}</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">Seu desempenho real em tempo real.</p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 sm:mb-12">
        <MetricCard title="Receita Total" value={formatCurrency(stats?.totalRevenue || 0)} iconName="dollar" color="blue" />
        <MetricCard title="Total de Vendas" value={formatNumber(stats?.totalSales || 0)} iconName="shopping" color="purple" />
        <MetricCard title="Taxa de Conversão" value={`${(stats?.conversionRate || 0).toFixed(1)}%`} iconName="trendingUp" color="green" />
        <MetricCard title="Clientes Ativos" value={formatNumber(stats?.totalCustomers || 0)} iconName="users" color="yellow" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 sm:mb-12">
        <div className="lg:col-span-2">
          <Card className="relative overflow-hidden border-0 bg-blue-950/20 shadow-2xl h-full">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl font-bold">Vendas dos Últimos 14 Dias</CardTitle>
              <CardDescription className="text-sm sm:text-base">Faturamento real por dia</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-8">
              {salesData && salesData.length > 0 ? (
                <SalesChart data={salesData} />
              ) : (
                <div className="h-56 sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm sm:text-base">
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

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-10 sm:mb-12">
        <MetricCard title="Produtos" value={formatNumber(stats?.totalProducts || 0)} iconName="package" color="blue" />
        <MetricCard title="Estoque Baixo" value={formatNumber(stats?.lowStockCount || 0)} iconName="alert" color={(stats?.lowStockCount || 0) > 0 ? "red" : "green"} />
        <MetricCard title="Aprovados" value={formatNumber(stats?.approvedPayments || 0)} iconName="check" color="green" />
        <MetricCard title="Pendentes" value={formatNumber(stats?.pendingPayments || 0)} iconName="zap" color="yellow" />
        <MetricCard title="Recusados" value={formatNumber(stats?.refusedPayments || 0)} iconName="alert" color="red" />
        <MetricCard title="Vendas Hoje" value={formatNumber(stats?.salesToday || 0)} iconName="trendingUp" color="purple" />
      </div>

      {/* Recent Orders Section */}
      <Card className="relative overflow-hidden border-0 bg-blue-950/20 shadow-2xl">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl font-bold">Últimos Pedidos</CardTitle>
          <CardDescription className="text-sm sm:text-base">Histórico real de vendas via Telegram</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {!recentOrders || recentOrders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm sm:text-base text-muted-foreground">
              Nenhum pedido registrado ainda.
            </p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-500/10 hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-sm">#</TableHead>
                      <TableHead className="text-muted-foreground text-sm">Cliente</TableHead>
                      <TableHead className="text-muted-foreground text-sm hidden md:table-cell">Produto</TableHead>
                      <TableHead className="text-muted-foreground text-sm">Valor</TableHead>
                      <TableHead className="text-muted-foreground text-sm">Pagamento</TableHead>
                      <TableHead className="text-muted-foreground text-sm hidden lg:table-cell">Entrega</TableHead>
                      <TableHead className="text-right text-muted-foreground text-sm">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow
                        key={o.id}
                        className="border-blue-500/10 hover:bg-blue-500/5 transition-colors duration-200"
                      >
                        <TableCell className="font-mono text-sm text-muted-foreground p-4">{o.id}</TableCell>
                        <TableCell className="text-white text-sm p-4">{o.customerName || (o.customerUsername ? `@${o.customerUsername}` : "—")}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm p-4 hidden md:table-cell">{o.productName || "—"}</TableCell>
                        <TableCell className="font-medium text-white text-sm p-4 whitespace-nowrap">{formatCurrency(o.amount || 0)}</TableCell>
                        <TableCell className="p-4"><PaymentStatusBadge status={o.paymentStatus} /></TableCell>
                        <TableCell className="p-4 hidden lg:table-cell"><DeliveryStatusBadge status={o.deliveryStatus} /></TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground p-4 whitespace-nowrap">{formatDateTime(o.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-4 px-4 py-4">
                {recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">#{o.id}</span>
                      <span className="text-xs text-muted-foreground/70">{formatDateTime(o.createdAt)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">
                        {o.customerName || (o.customerUsername ? `@${o.customerUsername}` : "—")}
                      </p>
                      {o.productName && (
                        <p className="text-xs text-muted-foreground truncate">{o.productName}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-500/10">
                      <span className="font-black text-white text-base">{formatCurrency(o.amount || 0)}</span>
                      <div className="flex items-center gap-2">
                        <PaymentStatusBadge status={o.paymentStatus} />
                        <DeliveryStatusBadge status={o.deliveryStatus} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
