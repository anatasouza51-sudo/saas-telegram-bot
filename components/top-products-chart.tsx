"use client"

import { memo, useMemo } from "react"
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell 
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface TopProduct {
  name: string
  sales: number
  revenue: number
}

interface TopProductsChartProps {
  products: TopProduct[]
}

const BAR_COLORS = ["#EC4899", "#A855F7", "#34D399", "#FBBF24", "#FB7185", "#60A5FA"]

export const TopProductsChart = memo(({ products }: TopProductsChartProps) => {
  const data = useMemo(() => {
    if (!products || products.length === 0) return []
    return products.slice(0, 6).map((p) => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + "..." : p.name,
      fullName: p.name,
      value: p.sales,
      revenue: p.revenue,
    }))
  }, [products])

  if (data.length === 0) {
    return (
      <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Top Produtos</CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">Mais vendidos</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-xs text-dashboard-text-muted">Sem dados de vendas</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Top Produtos</CardTitle>
        <CardDescription className="text-xs text-dashboard-text-muted mt-1">Mais vendidos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--dashboard-text-muted)", fontSize: 9, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--dashboard-text-muted)", fontSize: 9, fontWeight: 600 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="bg-dashboard-surface-elevated border border-dashboard-border rounded-lg px-3 py-2 shadow-xl">
                        <p className="text-xs font-bold text-dashboard-text">{d.fullName}</p>
                        <p className="text-[11px] text-dashboard-text-muted">{d.value} vendas</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
})

TopProductsChart.displayName = "TopProductsChart"
