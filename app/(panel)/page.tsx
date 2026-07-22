"use client"
import { useEffect, useState } from "react"
import { MetricCard } from "@/components/metric-card"
import { SalesChart } from "@/components/sales-chart"
import { CheckoutFunnel } from "@/components/checkout-funnel"
import { motion, AnimatePresence } from "framer-motion"
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

// Tipagens para o estado
interface DashboardStats {
  totalRevenue: number
  totalSales: number
  salesToday: number
  conversionRate: number
  pendingPayments: number
  approvedPayments: number
  refusedPayments: number
  totalCustomers: number
  totalProducts: number
  lowStockCount: number
}

export default function DashboardPage() {
  const [data, setData] = useState<{
    user: any
    stats: DashboardStats
    recentOrders: any[]
    salesData: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard') // Assumindo que criaremos este endpoint ou usaremos Server Actions
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  const { user, stats, recentOrders, salesData } = data || { 
    user: { name: "Operador" }, 
    stats: { totalRevenue: 0, totalSales: 0, salesToday: 0, conversionRate: 0, pendingPayments: 0, approvedPayments: 0, refusedPayments: 0, totalCustomers: 0, totalProducts: 0, lowStockCount: 0 },
    recentOrders: [],
    salesData: []
  }

  const totalCheckouts = (stats?.pendingPayments || 0) + (stats?.approvedPayments || 0) + (stats?.refusedPayments || 0)
  const approvedSales = stats?.approvedPayments || 0
  const totalConversion = totalCheckouts > 0 ? (approvedSales / totalCheckouts) * 100 : 0
  const funnelStages = [
    { label: "Checkouts Totais", value: totalCheckouts, percentage: 100 },
    { label: "Pagamentos Aprovados", value: approvedSales, percentage: totalConversion },
  ]

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-6 pb-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto min-h-screen"
    >
      {/* Header */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 sm:mb-10"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 leading-tight tracking-tighter">
          Bem-vindo, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.name || "Operador"}</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">Seu desempenho real em tempo real.</p>
      </motion.div>

      {/* Top Metrics Grid - Estilo Vertical conforme Imagem */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 sm:mb-12">
        <MetricCard index={0} title="Receita Aprovada" value={formatCurrency(stats?.totalRevenue || 0)} iconName="dollar" color="blue" />
        <MetricCard index={1} title="Aprovados" value={formatNumber(stats?.approvedPayments || 0)} iconName="check" color="green" />
        <MetricCard index={2} title="Pendentes" value={formatNumber(stats?.pendingPayments || 0)} iconName="clock" color="yellow" />
        <MetricCard index={3} title="Recusados" value={formatNumber(stats?.refusedPayments || 0)} iconName="x" color="red" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 sm:mb-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="relative overflow-hidden border-0 bg-blue-950/20 shadow-2xl h-full backdrop-blur-sm">
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
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1"
        >
          <CheckoutFunnel stages={funnelStages} totalConversion={totalConversion} />
        </motion.div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 sm:mb-12">
        <MetricCard index={4} title="Total de Vendas" value={formatNumber(stats?.totalSales || 0)} iconName="shopping" color="purple" />
        <MetricCard index={5} title="Vendas Hoje" value={formatNumber(stats?.salesToday || 0)} iconName="trendingUp" color="green" />
        <MetricCard index={6} title="Clientes Ativos" value={formatNumber(stats?.totalCustomers || 0)} iconName="users" color="blue" />
        <MetricCard index={7} title="Produtos em Loja" value={formatNumber(stats?.totalProducts || 0)} iconName="package" color="purple" />
        <MetricCard index={8} title="Estoque Baixo" value={formatNumber(stats?.lowStockCount || 0)} iconName="alert" color={(stats?.lowStockCount || 0) > 0 ? "red" : "green"} />
        <MetricCard index={9} title="Taxa de Conversão" value={`${(stats?.conversionRate || 0).toFixed(1)}%`} iconName="trendingUp" color="yellow" />
      </div>

      {/* Recent Orders Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="relative overflow-hidden border-0 bg-blue-950/20 shadow-2xl backdrop-blur-sm">
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
                      <AnimatePresence>
                        {recentOrders.map((o, idx) => (
                          <motion.tr
                            key={o.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + (idx * 0.05) }}
                            className="border-blue-500/10 hover:bg-blue-500/5 transition-colors duration-200 group"
                          >
                            <TableCell className="font-mono text-sm text-muted-foreground p-4">{o.id}</TableCell>
                            <TableCell className="text-white text-sm p-4">{o.customerName || (o.customerUsername ? `@${o.customerUsername}` : "—")}</TableCell>
                            <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm p-4 hidden md:table-cell">{o.productName || "—"}</TableCell>
                            <TableCell className="font-medium text-white text-sm p-4 whitespace-nowrap">{formatCurrency(o.amount || 0)}</TableCell>
                            <TableCell className="p-4"><PaymentStatusBadge status={o.paymentStatus} /></TableCell>
                            <TableCell className="p-4 hidden lg:table-cell"><DeliveryStatusBadge status={o.deliveryStatus} /></TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground p-4 whitespace-nowrap">{formatDateTime(o.createdAt)}</TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-4 px-4 py-4">
                  {recentOrders.map((o, idx) => (
                    <motion.div
                      key={o.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + (idx * 0.05) }}
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
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
