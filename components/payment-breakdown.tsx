import { memo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { CreditCard } from "lucide-react"

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

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5 text-dashboard-text-muted/30" />
          </div>
          <h4 className="text-xs font-bold text-dashboard-text uppercase tracking-wider">Status de Pagamentos</h4>
          <p className="text-[11px] text-dashboard-text-muted mt-1">Sem dados de pagamento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300 hover:border-dashboard-border-active">
      {/* Ambient glow */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/[0.05] to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header */}
      <div className="relative mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            Status de Pagamentos
          </h3>
        </div>
        <p className="text-xs text-dashboard-text-muted ml-10">{total} total de pagamentos</p>
      </div>

      <div className="relative flex items-center gap-6">
        {/* Donut */}
        <div className="w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={50}
                paddingAngle={2}
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
                    const pct = ((payload[0].value / total) * 100).toFixed(1)
                    return (
                      <div className="bg-dashboard-surface-elevated border border-dashboard-border rounded-xl px-3 py-2 shadow-2xl backdrop-blur-xl">
                        <p className="text-xs font-bold text-dashboard-text">{payload[0].name}</p>
                        <p className="text-[10px] text-dashboard-text-muted">{payload[0].value} ({pct}%)</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-3 flex-1">
          {data.map((entry, index) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0"
            return (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-xs text-dashboard-text-muted">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-dashboard-text tabular-nums">{entry.value}</span>
                  <span className="text-[10px] text-dashboard-text-muted">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

PaymentBreakdown.displayName = "PaymentBreakdown"
