"use client"

import { memo } from "react"
import { 
  ShoppingCart, Package, Users, Zap, TrendingUp, ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
      color: "pink",
    })),
  ]

  if (recentActions.length === 0) {
    return (
      <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-dashboard-border/50 bg-white/[0.01] py-4">
          <div>
            <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Atividade Recente</CardTitle>
            <CardDescription className="text-xs text-dashboard-text-muted mt-1">Últimas ações na loja</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-dashboard-surface-elevated flex items-center justify-center mb-3 border border-dashboard-border">
            <Zap className="w-5 h-5 text-dashboard-text-muted/30" />
          </div>
          <p className="text-xs text-dashboard-text-muted">Nenhuma atividade recente</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-dashboard-border/50 bg-white/[0.01] py-4">
        <div>
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Atividade Recente</CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">Últimas ações na loja</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-dashboard-accent hover:text-dashboard-accent hover:bg-dashboard-accent/10 gap-2 text-xs font-bold">
          Ver logs
          <ArrowRight className="w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-dashboard-border/30">
          {recentActions.map((action) => (
            <div key={action.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center shrink-0">
                <action.icon className="w-3.5 h-3.5 text-dashboard-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-dashboard-text truncate">{action.title}</p>
                <p className="text-[11px] text-dashboard-text-muted truncate">{action.description}</p>
              </div>
              <span className="text-[10px] font-bold text-dashboard-text-muted uppercase whitespace-nowrap">{action.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

DashboardActivity.displayName = "DashboardActivity"
