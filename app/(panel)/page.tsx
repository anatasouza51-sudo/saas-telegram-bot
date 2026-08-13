"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  Package,
  RefreshCcw,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SalesChart } from "@/components/sales-chart"
import { PaymentBreakdown } from "@/components/payment-breakdown"
import { DashboardActivity } from "@/components/dashboard-activity"
import { SalesOverview } from "@/components/sales-overview"
import { PaymentMetrics } from "@/components/payment-metrics"
import { TopCustomers } from "@/components/top-customers"
import { PaymentStatusBadge, DeliveryStatusBadge } from "@/components/status-badge"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const periodOptions = [
  { value: "today", label: "Hoje", chartLabel: "Hoje" },
  { value: "yesterday", label: "Ontem", chartLabel: "Ontem" },
  { value: "7d", label: "7d", chartLabel: "Últimos 7 dias" },
  { value: "30d", label: "30d", chartLabel: "Últimos 30 dias" },
  { value: "total", label: "Total", chartLabel: "Todo o período" },
] as const

type DashboardPeriod = (typeof periodOptions)[number]["value"]

export default function DashboardPage() {
  const [data, setData] = useState<{
    user: any
    stats: any
    recentOrders: any[]
    salesData: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<DashboardPeriod>("today")

  const fetchData = useCallback(async (selectedPeriod: DashboardPeriod) => {
    setIsRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard?period=${selectedPeriod}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Falha ao carregar dados do dashboard")
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(period)
  }, [fetchData, period])

  if (loading && !data) return <DashboardSkeleton />
  if (error && !data) return <DashboardError error={error} retry={() => fetchData(period)} />
  if (!data) return null

  const { stats, recentOrders, salesData } = data
  const selectedPeriodLabel = periodOptions.find((option) => option.value === period)?.chartLabel ?? "Hoje"
  const totalPayments = Math.max(
    (stats?.pendingPayments || 0) + (stats?.approvedPayments || 0) + (stats?.refusedPayments || 0),
    1,
  )

  const salesMetrics = [
    {
      label: "Receita total",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: <Wallet className="size-4 shrink-0" strokeWidth={1.8} />,
      color: "blue" as const,
      helper: "vendas aprovadas",
    },
    {
      label: period === "today" ? "Vendas hoje" : period === "yesterday" ? "Vendas ontem" : "Vendas no período",
      value: formatNumber(stats?.totalSales || 0),
      icon: <ShoppingCart className="size-4 shrink-0" strokeWidth={1.8} />,
      color: "green" as const,
      helper: selectedPeriodLabel.toLowerCase(),
    },
    {
      label: "Clientes",
      value: formatNumber(stats?.totalCustomers || 0),
      icon: <Users className="size-4 shrink-0" strokeWidth={1.8} />,
      color: "violet" as const,
      helper: "na sua operação",
    },
    {
      label: "Produtos ativos",
      value: formatNumber(stats?.totalProducts || 0),
      icon: <Package className="size-4 shrink-0" strokeWidth={1.8} />,
      color: "amber" as const,
      helper: "no catálogo",
    },
  ]

  const paymentMetrics = [
    {
      label: "Conversão",
      value: Math.round(stats?.conversionRate || 0),
      unit: `${stats?.approvedPayments || 0} aprovados`,
      color: "blue" as const,
    },
    {
      label: "Pendentes",
      value: Math.min(Math.round(((stats?.pendingPayments || 0) / totalPayments) * 100), 100),
      unit: `${stats?.pendingPayments || 0} aguardando`,
      color: "amber" as const,
    },
    {
      label: "Recusas",
      value: Math.min(Math.round(((stats?.refusedPayments || 0) / totalPayments) * 100), 100),
      unit: `${stats?.refusedPayments || 0} recusados`,
      color: "rose" as const,
    },
  ]

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
            ]),
        ).values(),
      ).slice(0, 5)
    : []

  return (
    <div className="relative space-y-4 pb-28 pt-1 sm:space-y-5 lg:pb-12">
      <section aria-busy={isRefreshing} className="rounded-[18px] border border-dashboard-border bg-dashboard-surface p-2.5 sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="px-2 sm:px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dashboard-text-muted">Período</p>
            <p className="mt-0.5 text-xs text-dashboard-text">Resumo de vendas e pagamentos</p>
          </div>
          <div className="grid grid-cols-5 gap-1 rounded-[13px] border border-dashboard-border bg-dashboard-bg/70 p-1">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={period === option.value}
                onClick={() => setPeriod(option.value)}
                className={cn(
                  "rounded-[10px] px-2 py-2 text-[11px] font-semibold transition-colors sm:px-4",
                  period === option.value
                    ? "bg-dashboard-surface-elevated text-dashboard-text shadow-sm"
                    : "text-dashboard-text-muted hover:bg-dashboard-surface-elevated hover:text-dashboard-text",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <SalesOverview metrics={salesMetrics} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        {salesData.length > 0 && <SalesChart data={salesData} periodLabel={selectedPeriodLabel} />}
        <PaymentBreakdown
          approved={stats?.approvedPayments || 0}
          pending={stats?.pendingPayments || 0}
          refused={stats?.refusedPayments || 0}
        />
      </div>

      <PaymentMetrics
        metrics={paymentMetrics}
        title="Saúde dos pagamentos"
        subtitle="Acompanhe aprovação, pendências e recusas"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DashboardActivity recentOrders={recentOrders || []} stats={stats || {}} periodLabel={selectedPeriodLabel} />
        <TopCustomers customers={topCustomersFromOrders} title="Principais clientes" />
      </div>

      <section className="overflow-hidden rounded-[22px] border border-dashboard-border bg-dashboard-surface">
        <div className="flex items-center justify-between border-b border-dashboard-border/70 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashboard-accent/20 bg-dashboard-accent/10">
              <ShoppingCart className="size-4 shrink-0 text-dashboard-accent" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-dashboard-text">Pedidos recentes</h3>
              <p className="text-[11px] text-dashboard-text-muted">Histórico real das vendas via Telegram</p>
            </div>
          </div>
          <Link
            href="/orders"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "gap-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-dashboard-accent hover:bg-dashboard-accent/10 hover:text-dashboard-accent",
            })}
          >
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashboard-border bg-dashboard-surface-elevated">
              <ShoppingCart className="size-6 shrink-0 text-dashboard-text-muted/40" strokeWidth={1.8} />
            </div>
            <h3 className="text-sm font-bold text-dashboard-text">Nenhum pedido ainda</h3>
            <p className="mt-1 max-w-xs text-xs leading-5 text-dashboard-text-muted">As vendas aparecerão aqui assim que começarem a chegar.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-dashboard-border/50 text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Produto</th>
                    <th className="px-5 py-3.5 text-center">Valor</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashboard-border/40">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-dashboard-surface-elevated/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashboard-accent/20 bg-dashboard-accent/10 text-[10px] font-black text-dashboard-accent">
                            {(order.customerName || order.customerUsername || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="max-w-[140px] truncate text-xs font-bold text-dashboard-text">
                            {order.customerName || (order.customerUsername ? `@${order.customerUsername}` : "—")}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="block max-w-[180px] truncate text-xs text-dashboard-text-muted">{order.productName || "—"}</span></td>
                      <td className="px-5 py-3.5 text-center"><span className="text-xs font-black tabular-nums text-dashboard-text">{formatCurrency(order.amount || 0)}</span></td>
                      <td className="px-5 py-3.5 text-center"><PaymentStatusBadge status={order.paymentStatus} /></td>
                      <td className="px-5 py-3.5 text-right"><span className="text-[10px] font-semibold uppercase text-dashboard-text-muted">{formatDateTime(order.createdAt)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-dashboard-border/40 md:hidden">
              {recentOrders.map((order) => (
                <div key={order.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashboard-accent/20 bg-dashboard-accent/10 text-[10px] font-black text-dashboard-accent">
                        {(order.customerName || order.customerUsername || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-xs font-bold text-dashboard-text">{order.customerName || (order.customerUsername ? `@${order.customerUsername}` : "—")}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-dashboard-text-muted">{formatDateTime(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-dashboard-text-muted">{order.productName || "—"}</span>
                    <span className="text-xs font-black tabular-nums text-dashboard-text">{formatCurrency(order.amount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2"><PaymentStatusBadge status={order.paymentStatus} /><DeliveryStatusBadge status={order.deliveryStatus} /></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 pb-28 pt-1 lg:pb-12">
      <div className="rounded-[22px] border border-dashboard-border bg-dashboard-surface p-5">
        <Skeleton className="mb-4 h-3 w-28 bg-dashboard-surface-elevated" />
        <Skeleton className="h-8 w-48 bg-dashboard-surface-elevated" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full bg-dashboard-surface-elevated" />
      </div>
      <div className="rounded-[18px] border border-dashboard-border bg-dashboard-surface p-3"><Skeleton className="h-12 w-full bg-dashboard-surface-elevated" /></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-[18px] border border-dashboard-border bg-dashboard-surface p-4"><Skeleton className="h-3 w-24 bg-dashboard-surface-elevated" /><Skeleton className="mt-5 h-8 w-28 bg-dashboard-surface-elevated" /><Skeleton className="mt-3 h-3 w-32 bg-dashboard-surface-elevated" /></div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]"><Skeleton className="h-[360px] rounded-[22px] bg-dashboard-surface" /><Skeleton className="h-[360px] rounded-[22px] bg-dashboard-surface" /></div>
    </div>
  )
}

function DashboardError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10"><AlertCircle className="h-8 w-8 text-rose-500" /></div>
      <h2 className="text-xl font-black tracking-tight text-dashboard-text">Ops! Algo deu errado</h2>
      <p className="mt-2 max-w-md text-sm text-dashboard-text-muted">{error}</p>
      <Button onClick={retry} className="mt-8 bg-dashboard-accent px-8 font-bold text-white hover:bg-dashboard-accent/90">Tentar novamente</Button>
    </div>
  )
}
