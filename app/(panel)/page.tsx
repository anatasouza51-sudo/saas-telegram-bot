"use client"

import { useEffect, useState, useCallback, memo } from "react"
import { 
  AlertCircle, 
  RefreshCcw, 
  ArrowRight,
  ShoppingCart,
} from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { SalesChart } from "@/components/sales-chart"
import { PaymentBreakdown } from "@/components/payment-breakdown"
import { DashboardActivity } from "@/components/dashboard-activity"
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

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-dashboard-text tracking-tight flex items-center gap-2">
            Olá, {user?.name?.split(' ')[0] || "Operador"} <span className="animate-bounce-slow">👋</span>
          </h2>
          <p className="text-sm text-dashboard-text-muted font-medium">
            Aqui está o que está acontecendo na sua loja hoje.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchData}
          className="bg-dashboard-surface border-dashboard-border text-dashboard-text-muted hover:text-dashboard-text hover:bg-white/5 self-start md:self-center gap-2"
        >
          <RefreshCcw className="w-3 h-3" />
          Atualizar
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita Aprovada"
          value={formatCurrency(stats?.totalRevenue || 0)}
          iconName="dollar"
          color="pink"
          trend="up"
          trendValue="+12.5%"
          index={0}
        />
        <MetricCard
          title="Aprovados"
          value={formatNumber(stats?.approvedPayments || 0)}
          iconName="check"
          color="green"
          index={1}
        />
        <MetricCard
          title="Pendentes"
          value={formatNumber(stats?.pendingPayments || 0)}
          iconName="clock"
          color="yellow"
          index={2}
        />
        <MetricCard
          title="Recusados"
          value={formatNumber(stats?.refusedPayments || 0)}
          iconName="x"
          color="red"
          index={3}
        />
      </div>

      {/* Gráfico + Métricas Secundárias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Receita */}
        <div className="lg:col-span-2">
          <SalesChart data={salesData} />
        </div>

        {/* Métricas Secundárias */}
        <div className="space-y-4">
          <MetricCard
            title="Taxa de Conversão"
            value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
            iconName="chart"
            color="purple"
            className="h-full"
            index={4}
          />
          <MetricCard
            title="Clientes Ativos"
            value={formatNumber(stats?.totalCustomers || 0)}
            iconName="users"
            color="blue"
            className="h-full"
            index={5}
          />
        </div>
      </div>

      {/* Métricas Secundárias + Breakdown de Pagamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:col-span-2">
          <MetricCard
            title="Total de Vendas"
            value={formatNumber(stats?.totalSales || 0)}
            iconName="shopping"
            color="indigo"
            index={7}
          />
          <MetricCard
            title="Vendas Hoje"
            value={formatNumber(stats?.salesToday || 0)}
            iconName="zap"
            color="yellow"
            index={8}
          />
          <MetricCard
            title="Produtos em Loja"
            value={formatNumber(stats?.totalProducts || 0)}
            iconName="package"
            color="green"
            index={9}
          />
        </div>
        <PaymentBreakdown
          approved={stats?.approvedPayments || 0}
          pending={stats?.pendingPayments || 0}
          refused={stats?.refusedPayments || 0}
        />
      </div>

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
              <div className="w-16 h-16 rounded-2xl bg-dashboard-surface-elevated flex items-center justify-center mb-4 border border-dashboard-border">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-dashboard-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[380px] rounded-2xl bg-dashboard-surface" />
        <div className="space-y-4">
          <Skeleton className="h-[180px] rounded-2xl bg-dashboard-surface" />
          <Skeleton className="h-[180px] rounded-2xl bg-dashboard-surface" />
        </div>
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
