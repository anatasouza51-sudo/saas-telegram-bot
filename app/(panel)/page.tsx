import { requireUser } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
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
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Package,
  AlertTriangle,
  TrendingUp,
} from "lucide-react"

export default async function DashboardPage() {
  const user = await requireUser()
  const [stats, recentOrders, salesData] = await Promise.all([
    getDashboardStats(user.storeId),
    getRecentOrders(user.storeId),
    getSalesChart(user.storeId, 14),
  ])

  // Mock funnel data - in production, this would come from actual data
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
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Primary metrics - 4 columns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Receita total"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            tone="success"
            hint="Pagamentos aprovados"
          />
          <StatCard
            title="Total de vendas"
            value={formatNumber(stats.totalSales)}
            icon={ShoppingCart}
            tone="primary"
          />
          <StatCard
            title="Vendas do dia"
            value={formatNumber(stats.salesToday)}
            icon={CalendarClock}
            tone="default"
          />
          <StatCard
            title="Conversão"
            value={`${stats.conversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            tone="primary"
            hint="Aprovados / total de pedidos"
          />
        </div>

        {/* Main content area - Chart + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales chart - takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-950/40 via-purple-950/40 to-blue-950/40 shadow-2xl shadow-purple-900/20">
              {/* Glow effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              
              <CardHeader className="relative z-10">
                <CardTitle>Vendas dos últimos 14 dias</CardTitle>
                <CardDescription>
                  Receita diária de pagamentos aprovados.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <SalesChart data={salesData} />
              </CardContent>
            </Card>
          </div>

          {/* Checkout Funnel - takes 1 column */}
          <div className="lg:col-span-1">
            <CheckoutFunnel stages={funnelStages} totalConversion={totalConversion} />
          </div>
        </div>

        {/* Secondary metrics - 6 columns */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard
            title="Pendentes"
            value={formatNumber(stats.pendingPayments)}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            title="Aprovados"
            value={formatNumber(stats.approvedPayments)}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            title="Recusados"
            value={formatNumber(stats.refusedPayments)}
            icon={XCircle}
            tone="destructive"
          />
          <StatCard
            title="Clientes"
            value={formatNumber(stats.totalCustomers)}
            icon={Users}
          />
          <StatCard
            title="Produtos"
            value={formatNumber(stats.totalProducts)}
            icon={Package}
          />
          <StatCard
            title="Estoque baixo"
            value={formatNumber(stats.lowStockCount)}
            icon={AlertTriangle}
            tone={stats.lowStockCount > 0 ? "destructive" : "default"}
          />
        </div>

        {/* Recent orders */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-950/40 via-purple-950/40 to-blue-950/40 shadow-2xl shadow-purple-900/20">
          {/* Glow effect background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <CardHeader className="relative z-10">
            <CardTitle>Últimos pedidos</CardTitle>
            <CardDescription>
              Pedidos mais recentes recebidos via Telegram.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 px-0">
            {recentOrders.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido registrado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {o.id}
                        </TableCell>
                        <TableCell>
                          {o.customerName ||
                            (o.customerUsername
                              ? `@${o.customerUsername}`
                              : "—")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {o.productName || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(o.amount)}
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
    </>
  )
}
