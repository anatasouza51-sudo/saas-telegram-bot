import { memo } from "react"
import { ShoppingCart, ArrowRight, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  stats: {
    salesToday?: number
    totalProducts?: number
    totalCustomers?: number
  }
}

export const DashboardActivity = memo(({ recentOrders, stats }: DashboardActivityProps) => {
  const recentActions = [
    ...(recentOrders?.slice(0, 5) || []).map((order) => ({
      id: `order-${order.id}`,
      icon: ShoppingCart,
      title: order.customerName || order.customerUsername || "Cliente",
      description: `${order.productName || "Produto"} — ${formatCurrency(order.amount || 0)}`,
      time: order.createdAt ? formatDateTime(order.createdAt) : "Recente",
    })),
  ]

  if (recentActions.length === 0) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Atividade Recente</h3>
            <p className="text-xs text-dashboard-text-muted">Últimas ações na loja</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center mb-3">
            <Activity className="w-4 h-4 text-dashboard-text-muted/30" />
          </div>
          <p className="text-xs text-dashboard-text-muted">Nenhuma atividade recente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300 hover:border-dashboard-border-active">
      {/* Ambient glow */}
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500/[0.05] to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Atividade Recente</h3>
            <p className="text-xs text-dashboard-text-muted">Últimas ações na loja</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-dashboard-accent hover:text-dashboard-accent hover:bg-dashboard-accent/10 gap-2 text-xs font-bold">
          Ver logs
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative space-y-1">
        {recentActions.map((action, index) => (
          <div
            key={action.id}
            className="relative flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
          >
            {/* Timeline dot */}
            <div className="relative flex items-center">
              <div className="w-8 h-8 rounded-lg bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center shrink-0">
                <action.icon className="w-3.5 h-3.5 text-dashboard-accent" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-dashboard-text truncate">{action.title}</p>
              <p className="text-[11px] text-dashboard-text-muted truncate">{action.description}</p>
            </div>

            {/* Time */}
            <span className="text-[10px] font-semibold text-dashboard-text-muted uppercase whitespace-nowrap">
              {action.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

DashboardActivity.displayName = "DashboardActivity"
