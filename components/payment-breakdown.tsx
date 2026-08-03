"use client"

import { memo } from "react"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface PaymentBreakdownProps {
  approved: number
  pending: number
  refused: number
}

const COLORS = ["#34D399", "#FBBF24", "#FB7185"]
const LABELS = ["Aprovado", "Pendente", "Recusado"]

export const PaymentBreakdown = memo(({ approved, pending, refused }: PaymentBreakdownProps) => {
  const data = [
    { name: "Aprovado", value: approved },
    { name: "Pendente", value: pending },
    { name: "Recusado", value: refused },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Status de Pagamentos</CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">Distribuição atual</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-xs text-dashboard-text-muted">Sem dados de pagamento</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">Status de Pagamentos</CardTitle>
        <CardDescription className="text-xs text-dashboard-text-muted mt-1">Distribuição atual</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4 py-2">
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-dashboard-surface-elevated border border-dashboard-border rounded-lg px-3 py-2 shadow-xl">
                        <p className="text-xs font-bold text-dashboard-text">{payload[0].name}</p>
                        <p className="text-xs text-dashboard-text-muted">{payload[0].value} ({((payload[0].value / data.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%)</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 flex-1">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs font-medium text-dashboard-text-muted">{entry.name}</span>
              </div>
              <span className="text-xs font-black text-dashboard-text tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

PaymentBreakdown.displayName = "PaymentBreakdown"
