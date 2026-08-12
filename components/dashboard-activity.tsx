"use client"

import { memo } from "react"
import { ShoppingCart, ArrowRight, Activity, Clock3 } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { formatCurrency, formatDateTime } from "@/lib/format"

interface RecentOrder {
  id: string
  customerName?: string
  customerUsername?: string
  productName?: string
  amount?: number
  paymentStatus?: string
  deliveryStatus?: string
  createdAt?: string
}

interface DashboardActivityProps {
  recentOrders: RecentOrder[]
  stats: { totalSales?: number }
  periodLabel: string
}

export const DashboardActivity = memo(({ recentOrders, stats, periodLabel }: DashboardActivityProps) => {
  const recentActions = (recentOrders?.slice(0, 5) || []).map((order) => ({
    id: `order-${order.id}`,
    title: order.customerName || order.customerUsername || "Cliente",
    description: `${order.productName || "Produto"} — ${formatCurrency(order.amount || 0)}`,
    time: order.createdAt ? formatDateTime(order.createdAt) : "Recente",
  }))

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10">
            <Activity className="size-4 shrink-0 text-blue-400" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dashboard-text">Log de atividades</h3>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">{periodLabel} · {stats?.totalSales || 0} vendas</p>
          </div>
        </div>
        <Link
          href="/logs"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "h-8 gap-1 rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider text-dashboard-accent hover:bg-dashboard-accent/10 hover:text-dashboard-accent",
          })}
        >
          Ver logs
          <ArrowRight className="size-3 shrink-0" strokeWidth={1.8} />
        </Link>
      </div>

      {recentActions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dashboard-border px-4 py-12 text-center">
          <Activity className="mb-3 size-6 shrink-0 text-dashboard-text-muted/40" strokeWidth={1.8} />
          <p className="text-xs text-dashboard-text-muted">Nenhuma atividade recente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentActions.map((action) => (
            <div key={action.id} className="flex items-center gap-3 rounded-2xl border border-dashboard-border/70 bg-dashboard-bg/45 p-3 transition-colors hover:border-dashboard-border-active hover:bg-dashboard-surface-elevated/60 sm:p-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10">
                <ShoppingCart className="size-4 shrink-0 text-blue-400" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-dashboard-text">{action.title}</p>
                <p className="mt-1 truncate text-[11px] text-dashboard-text-muted">{action.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase text-dashboard-text-muted">
                <Clock3 className="size-3 shrink-0" strokeWidth={1.8} />
                <span className="hidden sm:inline">{action.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
})

DashboardActivity.displayName = "DashboardActivity"
