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
  LayoutDashboard,
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
  DeliveryStatusBadge,
} from "@/components/status-badge"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
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
    <div className="space-y-5 pb-12 animate-in fade-in duration-500">
      {/* Cabeçalho do dashboard inspirado no shell operacional do SharkBot */}
      <div className="flex flex-col gap-4 border-b border-dashboard-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-dashboard-accent">Visão geral</p>
          <h2 className="font-space text-2xl font-bold tracking-tight text-dashboard-text md:text-3xl">
            Olá, {user?.name?.split(" ")[0] || "bem-vindo"}
          </h2>
          <p className="mt-1 text-sm text-dashboard-text-muted">Acompanhe vendas, clientes e pagamentos em um só lugar.</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className={cn(
            "h-9 self-start rounded-lg border border-dashboard-border px-3 text-dashboard-text-muted transition-all hover:border-dashboard-border-active hover:bg-dashboard-surface-elevated hover:text-dashboard-text sm:self-auto",
            loading && "cursor-not-allowed opacity-50"
          )}
        >
          <RefreshCcw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizar</span>
        </Button>
      </div>

      {/* Sales Overview - Métricas principais */}
      <SalesOverview metrics={salesMetrics} />

      {/* Gráfico de Receita + Breakdown de Pagamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <SalesChart data={salesData} />
        </div>
        <div className="lg:col-span-2">
          <PaymentBreakdown
            approved={stats?.approvedPayments || 0}
            pending={stats?.pendingPayments || 0}
            refused={stats?.refusedPayments || 0}
          />
        </div>
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
      <div className="group relative overflow-hidden rounded-xl border border-dashboard-border bg-dashboard-surface transition-all duration-300 hover:border-dashboard-border-active">
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-dashboard-border/50 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Pedidos Recentes</h3>
              <p className="text-xs text-dashboard-text-muted">Histórico real de vendas via Telegram</p>
            </div>
          </div>
          <Link
            href="/orders"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "text-dashboard-accent hover:text-dashboard-accent hover:bg-dashboard-accent/10 gap-2 text-xs font-bold",
            })}
          >
            Ver todos
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="relative p-0">
          {!recentOrders || recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center mb-4">
                <ShoppingCart className="w-7 h-7 text-dashboard-text-muted/30" />
              </div>
              <h3 className="text-sm font-bold text-dashboard-text">Nenhum pedido ainda</h3>
              <p className="text-xs text-dashboard-text-muted mt-1">As vendas aparecerão aqui assim que começarem a chegar.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-dashboard-text-muted uppercase tracking-widest bg-white/[0.015]">
                      <th className="px-6 py-3.5">Cliente</th>
                      <th className="px-6 py-3.5">Produto</th>
                      <th className="px-6 py-3.5 text-center">Valor</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashboard-border/20">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="group/row hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-dashboard-border flex items-center justify-center text-[10px] font-black text-dashboard-text-muted group-hover/row:text-dashboard-accent transition-colors">
                              {(order.customerName || order.customerUsername || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-dashboard-text truncate max-w-[120px]">
                              {order.customerName || (order.customerUsername ? `@${order.customerUsername}` : "—")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-xs text-dashboard-text-muted truncate max-w-[150px] block">{order.productName || "—"}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-xs font-black text-dashboard-text tabular-nums">
                            {formatCurrency(order.amount || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <PaymentStatusBadge status={order.paymentStatus} />
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="text-[10px] font-semibold text-dashboard-text-muted uppercase">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-dashboard-border/20">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-dashboard-border flex items-center justify-center text-[10px] font-black text-dashboard-text-muted">
                          {(order.customerName || order.customerUsername || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-dashboard-text">
                          {order.customerName || (order.customerUsername ? `@${order.customerUsername}` : "—")}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-dashboard-text-muted uppercase">
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
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-12 pt-6">
      {/* Title skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-8 w-28 bg-dashboard-surface" />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl border border-dashboard-border bg-dashboard-surface">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-3 w-16 bg-dashboard-surface-elevated" />
              <Skeleton className="h-9 w-9 rounded-xl bg-dashboard-surface-elevated" />
            </div>
            <Skeleton className="h-7 w-24 bg-dashboard-surface-elevated" />
          </div>
        ))}
      </div>

      {/* Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 p-5 rounded-2xl border border-dashboard-border bg-dashboard-surface h-[340px]">
          <Skeleton className="h-6 w-40 bg-dashboard-surface-elevated mb-6" />
          <Skeleton className="h-52 w-full bg-dashboard-surface-elevated rounded-xl" />
        </div>
        <div className="lg:col-span-2 p-5 rounded-2xl border border-dashboard-border bg-dashboard-surface h-[340px]">
          <Skeleton className="h-6 w-36 bg-dashboard-surface-elevated mb-6" />
          <Skeleton className="h-28 w-28 rounded-full bg-dashboard-surface-elevated mx-auto" />
        </div>
      </div>

      {/* Metrics circles */}
      <div className="p-5 rounded-2xl border border-dashboard-border bg-dashboard-surface">
        <Skeleton className="h-6 w-48 bg-dashboard-surface-elevated mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3 p-4">
              <Skeleton className="w-[88px] h-[88px] rounded-full bg-dashboard-surface-elevated" />
              <Skeleton className="h-3 w-20 bg-dashboard-surface-elevated" />
            </div>
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div className="p-5 rounded-2xl border border-dashboard-border bg-dashboard-surface">
        <Skeleton className="h-6 w-40 bg-dashboard-surface-elevated mb-6" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg bg-dashboard-surface-elevated" />
              <Skeleton className="h-3 w-24 bg-dashboard-surface-elevated" />
              <Skeleton className="h-3 w-16 bg-dashboard-surface-elevated ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DashboardError({ error, retry }: { error: string; retry: () => void }) {
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
