"use client"

import { useEffect, useState, useCallback, memo } from "react"
import { 
  AlertCircle, 
  RefreshCcw, 
  ArrowRight,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
} from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { SalesChart } from "@/components/sales-chart"
import { PaymentBreakdown } from "@/components/payment-breakdown"
import { DashboardActivity } from "@/components/dashboard-activity"
import { SalesOverview } from "@/components/sales-overview"
import { TopProductsSection } from "@/components/top-products-section"
import { PaymentMetrics } from "@/components/payment-metrics"
import { TopCustomers } from "@/components/top-customers"
import { 
  PaymentStatusBadge, 
  DeliveryStatusBadge 
} from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export default function DashboardPage() {
  const [data, setData] = useState<{
    user: any
    stats: any
    recentOrders: any[]
    salesData: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/dashboard")
      if (!res.ok) throw new Error("Falha ao carregar dados do dashboard")
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <DashboardSkeleton />
  if (error) return <DashboardError error={error} retry={fetchData} />
  if (!data) return null

  const { stats, recentOrders, salesData, user } = data

  // Dados para Sales Overview - Conectados à API
  const salesMetrics = [
    {
      label: "Receita Total",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: <TrendingUp className="w-full h-full" />,
      color: "pink" as const,
    },
    {
      label: "Vendas Hoje",
      value: formatNumber(stats?.salesToday || 0),
      icon: <ShoppingCart className="w-full h-full" />,
      color: "green" as const,
    },
    {
      label: "Total de Clientes",
      value: formatNumber(stats?.totalCustomers || 0),
      icon: <Users className="w-full h-full" />,
      color: "yellow" as const,
    },
    {
      label: "Produtos em Loja",
      value: formatNumber(stats?.totalProducts || 0),
      icon: <Package className="w-full h-full" />,
      color: "purple" as const,
    },
  ]

  // Dados para Payment Metrics - Conectados à API
  const paymentMetrics = [
    {
      label: "Taxa de Conversão",
      value: Math.round(stats?.conversionRate || 0),
      unit: "% de aprovação",
      color: "pink" as const,
    },
    {
      label: "Pagamentos Pendentes",
      value: Math.min(Math.round((stats?.pendingPayments / Math.max(stats?.pendingPayments + stats?.approvedPayments + stats?.refusedPayments, 1)) * 100), 100),
      unit: `${stats?.pendingPayments || 0} aguardando`,
      color: "yellow" as const,
    },
    {
      label: "Taxa de Recusa",
      value: Math.min(Math.round((stats?.refusedPayments / Math.max(stats?.pendingPayments + stats?.approvedPayments + stats?.refusedPayments, 1)) * 100), 100),
      unit: `${stats?.refusedPayments || 0} recusados`,
      color: "purple" as const,
    },
  ]

  // Filtrar clientes reais dos pedidos recentes
  const topCustomersFromOrders = recentOrders && recentOrders.length > 0 
    ? Array.from(
        new Map(
          recentOrders
            .filter((order: any) => order.customerName || order.customerUsername)
            .map((order: any) => [
              order.customerId || order.customerUsername,
              {
                id: order.customerId || order.customerUsername,
                name: order.customerName || order.customerUsername || "Cliente",
                totalSpent: order.amount || 0,
                orderCount: 1,
              },
            ])
        ).values()
      )
      .slice(0, 5)
    : []

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header Premium - Barra Compacta */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-dashboard-accent/10 to-dashboard-accent-secondary/10 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-700"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dashboard-surface/40 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-xl">
          <div className="flex items-center gap-6">
            <div className="flex flex-col border-r border-white/10 pr-6">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Status: Online</p>
              </div>
              <h2 className="text-2xl font-black text-dashboard-text tracking-tight">
                Olá, {user?.name?.split(' ')[0] || "Operador"}
              </h2>
            </div>
            
            <p className="text-xs md:text-sm text-dashboard-text-muted font-medium max-w-md leading-tight">
              {stats?.pendingPayments > 0 
                ? `Você tem ${stats.pendingPayments} pagamento${stats.pendingPayments > 1 ? 's' : ''} pendente${stats.pendingPayments > 1 ? 's' : ''} aguardando sua aprovação.` 
                : stats?.salesToday > 0 
                  ? `Excelente! Sua loja já processou ${stats.salesToday} venda${stats.salesToday > 1 ? 's' : ''} hoje.` 
                  : "Sua loja está configurada e pronta para receber novas vendas via Telegram."}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end text-right">
              <p className="text-[9px] font-bold text-dashboard-text-muted uppercase tracking-widest opacity-50">Painel de Controle</p>
              <p className="text-[9px] font-bold text-dashboard-text-muted uppercase tracking-widest opacity-50">
                Atualizado: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={loading}
              className={cn(
                "h-10 px-4 bg-white/5 border-white/10 text-dashboard-text hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-xl gap-2 backdrop-blur-md group/btn",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCcw className={cn("w-3.5 h-3.5 transition-transform duration-500 group-hover/btn:rotate-180", loading && "animate-spin")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Atualizar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sales Overview - Métricas principais */}
      <SalesOverview 
        metrics={salesMetrics}
      />

      {/* Gráfico de Receita + Breakdown de Pagamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Receita */}
        <div className="lg:col-span-2">
          <SalesChart data={salesData} />
        </div>

        {/* Breakdown de Pagamentos */}
        <PaymentBreakdown
          approved={stats?.approvedPayments || 0}
          pending={stats?.pendingPayments || 0}
          refused={stats?.refusedPayments || 0}
        />
      </div>

      {/* Payment Metrics - Taxa de conversão e status */}
      <PaymentMetrics 
        metrics={paymentMetrics}
        title="Métricas de Pagamento"
        subtitle="Taxa de conversão e status dos pagamentos"
      />

      {/* Top Customers - Principais clientes (vindo dos dados reais) */}
      <TopCustomers 
        customers={topCustomersFromOrders}
        title="Principais Clientes"
      />

      {/* Atividade Recente */}
      <DashboardActivity
        recentOrders={recentOrders || []}
        stats={stats || {}}
      />

      {/* Pedidos Recentes */}
      <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-dashboard-border/50 bg-white/[0.01] py-4">
          <div>
            <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Pedidos Recentes</CardTitle>
            <CardDescription className="text-xs text-dashboard-text-muted mt-1">Histórico real de vendas via Telegram</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-dashboard-accent hover:text-dashboard-accent hover:bg-dashboard-accent/10 gap-2 text-xs font-bold">
            Ver todos
            <ArrowRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!recentOrders || recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-dashboard-text-muted/30" />
              </div>
              <h3 className="text-dashboard-text font-bold">Nenhum pedido ainda</h3>
              <p className="text-dashboard-text-muted text-xs mt-1">As vendas aparecerão aqui assim que começarem a chegar.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-dashboard-text-muted uppercase tracking-widest bg-white/[0.02]">
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Produto</th>
                      <th className="px-6 py-4 text-center">Valor</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashboard-border/30">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center text-[10px] font-black text-dashboard-text-muted group-hover:text-dashboard-accent transition-colors">
                              {(order.customerName || order.customerUsername || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-dashboard-text truncate max-w-[120px]">
                              {order.customerName || (order.customerUsername ? `@${order.customerUsername}` : "—")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-dashboard-text-muted truncate max-w-[150px] block">{order.productName || "—"}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-black text-dashboard-text tabular-nums">
                            {formatCurrency(order.amount || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <PaymentStatusBadge status={order.paymentStatus} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[10px] font-bold text-dashboard-text-muted uppercase">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-dashboard-border/30">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center text-[10px] font-black text-dashboard-text-muted">
                          {(order.customerName || order.customerUsername || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-dashboard-text">
                          {order.customerName || (order.customerUsername ? `@${order.customerUsername}` : "—")}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-dashboard-text-muted uppercase">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dashboard-text-muted truncate max-w-[200px]">{order.productName || "—"}</span>
                      <span className="text-xs font-black text-dashboard-text tabular-nums">
                        {formatCurrency(order.amount || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2">
                        <PaymentStatusBadge status={order.paymentStatus} />
                        <DeliveryStatusBadge status={order.deliveryStatus} />
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-dashboard-accent uppercase px-2">Detalhes</Button>
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

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-12 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-dashboard-surface" />
          <Skeleton className="h-4 w-64 bg-dashboard-surface" />
        </div>
        <Skeleton className="h-9 w-32 bg-dashboard-surface" />
      </div>
      <Skeleton className="h-40 rounded-2xl bg-dashboard-surface" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[380px] rounded-2xl bg-dashboard-surface" />
        <Skeleton className="h-[380px] rounded-2xl bg-dashboard-surface" />
      </div>
      <Skeleton className="h-96 rounded-2xl bg-dashboard-surface" />
    </div>
  )
}

function DashboardError({ error, retry }: { error: string, retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
        <AlertCircle className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-xl font-black text-dashboard-text tracking-tight">Ops! Algo deu errado</h2>
      <p className="text-dashboard-text-muted text-sm mt-2 max-w-md">{error}</p>
      <Button 
        onClick={retry}
        className="mt-8 bg-dashboard-accent hover:bg-dashboard-accent/90 text-white font-bold px-8"
      >
        Tentar Novamente
      </Button>
    </div>
  )
}
