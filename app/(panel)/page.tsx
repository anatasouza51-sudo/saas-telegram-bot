import { requireUser } from "@/lib/session"
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
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  Zap,
  CheckCircle2,
} from "lucide-react"

export default async function DashboardPage() {
  const user = await requireUser()
  
  // Failsafe data fetching
  let stats = {
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
  let recentOrders: any[] = []
  let salesData: any[] = []

  try {
    const [fetchedStats, fetchedOrders, fetchedChart] = await Promise.all([
      getDashboardStats(user.storeId).catch(() => stats),
      getRecentOrders(user.storeId).catch(() => []),
      getSalesChart(user.storeId, 14).catch(() => []),
    ])
    
    if (fetchedStats) stats = fetchedStats
    if (fetchedOrders) recentOrders = fetchedOrders
    if (fetchedChart) salesData = fetchedChart
  } catch (error) {
    console.error("Dashboard data fetch error:", error)
  }

  // Mock funnel data
  const funnelStages = [
    { label: "Checkouts", value: 2314, percentage: 100 },
    { label: "Dados Pessoais", value: 1511, percentage: 65.3 },
    { label: "Método de Pagamento", value: 943, percentage: 40.8 },
    { label: "Isto Gerado", value: 410, percentage: 17.7 },
    { label: "Vendas", value: 243, percentage: 10.5 },
  ]

  const totalCheckouts = funnelStages[0].value
  const totalSales = funnelStages[funnelStages.length - 1].value
  const totalConversion = (totalSales / totalCheckouts) * 100

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="mb-12 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          Bem-vindo, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user.name}</span>
        </h1>
        <p className="text-lg text-muted-foreground">Seu desempenho em tempo real</p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <MetricCard
          title="Receita Total"
          value={formatCurrency(stats.totalRevenue || 0)}
          icon={DollarSign}
          color="blue"
          trend="up"
          trendValue="+16.0%"
        />
        <MetricCard
          title="Total de Vendas"
          value={formatNumber(stats.totalSales || 0)}
          icon={ShoppingCart}
          color="purple"
          trend="up"
          trendValue="+12.5%"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${(stats.conversionRate || 0).toFixed(1)}%`}
          icon={TrendingUp}
          color="green"
          trend="up"
          trendValue="+2.3%"
        />
        <MetricCard
          title="Clientes Ativos"
          value={formatNumber(stats.totalCustomers || 0)}
          icon={Users}
          color="yellow"
          trend="up"
          trendValue="+8.1%"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-950/40 via-purple-950/40 to-blue-950/40 shadow-2xl shadow-purple-900/20 h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            <CardHeader className="relative z-10">
              <CardTitle>Vendas dos Últimos 14 Dias</CardTitle>
              <CardDescription>Receita diária de pagamentos aprovados</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              {salesData && salesData.length > 0 ? (
                <SalesChart data={salesData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados para exibir no gráfico
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <CheckoutFunnel stages={funnelStages} totalConversion={totalConversion} />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
        <MetricCard
          title="Produtos"
          value={formatNumber(stats.totalProducts || 0)}
          icon={Package}
          color="blue"
        />
        <MetricCard
          title="Estoque Baixo"
          value={formatNumber(stats.lowStockCount || 0)}
          icon={AlertTriangle}
          color={(stats.lowStockCount || 0) > 0 ? "red" : "green"}
        />
        <MetricCard
          title="Aprovados"
          value={formatNumber(stats.approvedPayments || 0)}
          icon={CheckCircle2}
          color="green"
        />
        <MetricCard
          title="Pendentes"
          value={formatNumber(stats.pendingPayments || 0)}
          icon={Zap}
          color="yellow"
        />
        <MetricCard
          title="Recusados"
          value={formatNumber(stats.refusedPayments || 0)}
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          title="Vendas Hoje"
          value={formatNumber(stats.salesToday || 0)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Recent Orders */}
      <div className="animate-fade-in-up">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-950/40 via-purple-950/40 to-blue-950/40 shadow-2xl shadow-purple-900/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <CardHeader className="relative z-10">
            <CardTitle>Últimos Pedidos</CardTitle>
            <CardDescription>Pedidos mais recentes recebidos via Telegram</CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10 px-0">
            {!recentOrders || recentOrders.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido registrado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-500/10 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">#</TableHead>
                      <TableHead className="text-muted-foreground">Cliente</TableHead>
                      <TableHead className="text-muted-foreground">Produto</TableHead>
                      <TableHead className="text-muted-foreground">Valor</TableHead>
                      <TableHead className="text-muted-foreground">Pagamento</TableHead>
                      <TableHead className="text-muted-foreground">Entrega</TableHead>
                      <TableHead className="text-right text-muted-foreground">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow 
                        key={o.id}
                        className="border-blue-500/10 hover:bg-blue-500/5 transition-colors duration-200"
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {o.id}
                        </TableCell>
                        <TableCell className="text-white">
                          {o.customerName ||
                            (o.customerUsername
                              ? `@${o.customerUsername}`
                              : "—")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {o.productName || "—"}
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {formatCurrency(o.amount || 0)}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={o.paymentStatus} />
                        </TableCell>
                        <TableCell>
                          <DeliveryStatusBadge status={o.deliveryStatus} />
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDateTime(o.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
