"use client"

import { memo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { CreditCard } from "lucide-react"

interface PaymentBreakdownProps {
  approved: number
  pending: number
  refused: number
}

const COLORS = ["#34D399", "#FBBF24", "#FB7185"]

export const PaymentBreakdown = memo(({ approved, pending, refused }: PaymentBreakdownProps) => {
  const data = [
    { name: "Aprovado", value: approved },
    { name: "Pendente", value: pending },
    { name: "Recusado", value: refused },
  ].filter((item) => item.value > 0)
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const conversion = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
          <CreditCard className="size-4 shrink-0 text-emerald-400" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-dashboard-text">Conversão</h3>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">Status dos pagamentos</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="font-space text-4xl font-bold text-dashboard-text">0%</p>
          <p className="mt-2 text-xs text-dashboard-text-muted">Aguardando os primeiros pagamentos</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-44 w-44 [&_.recharts-surface]:outline-none [&_.recharts-surface:focus]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={53} outerRadius={74} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {data.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const value = Number(payload[0].value || 0)
                    return (
                      <div className="rounded-xl border border-dashboard-border bg-dashboard-surface-elevated px-3 py-2 shadow-xl">
                        <p className="text-xs font-bold text-dashboard-text">{payload[0].name}</p>
                        <p className="text-[10px] text-dashboard-text-muted">{value} ({total ? ((value / total) * 100).toFixed(1) : 0}%)</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-space text-3xl font-bold text-dashboard-text">{conversion}%</span>
              <span className="text-[10px] uppercase tracking-wider text-dashboard-text-muted">aprovados</span>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            {data.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-xs text-dashboard-text-muted">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tabular-nums text-dashboard-text">{entry.value}</span>
                  <span className="text-[10px] text-dashboard-text-muted">{total ? Math.round((entry.value / total) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
})

PaymentBreakdown.displayName = "PaymentBreakdown"
