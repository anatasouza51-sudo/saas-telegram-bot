"use client"

import { memo, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { CreditCard } from "lucide-react"
import { DashboardBeam } from "@/components/dashboard-beam"

interface PaymentBreakdownProps {
  approved: number
  pending: number
  refused: number
}

const COLORS = ["#34D399", "#FBBF24", "#FB7185"]
const CHART_SIZE = 176
const CENTER = CHART_SIZE / 2
const LABEL_RADIUS = 96

export const PaymentBreakdown = memo(({ approved, pending, refused }: PaymentBreakdownProps) => {
  const data = [
    { name: "Aprovado", value: approved },
    { name: "Pendente", value: pending },
    { name: "Recusado", value: refused },
  ].filter((item) => item.value > 0)
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const conversion = total > 0 ? Math.round((approved / total) * 100) : 0
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const selectedIndex = selectedName ? data.findIndex((entry) => entry.name === selectedName) : -1
  const selectedEntry = selectedIndex >= 0 ? data[selectedIndex] : undefined
  const selectedPercentage = selectedEntry && total > 0 ? Math.round((selectedEntry.value / total) * 100) : 0
  const handleSliceClick = (name: string) => {
    setSelectedName((current) => current === name ? null : name)
  }


  let selectedLabelStyle: { left?: string; right?: string; top: string } = { top: "50%" }
  if (selectedEntry && total > 0) {
    const previousValue = data.slice(0, selectedIndex).reduce((sum, entry) => sum + entry.value, 0)
    const middleAngle = 90 - ((previousValue + selectedEntry.value / 2) / total) * 360
    const angle = (middleAngle * Math.PI) / 180
    const y = CENTER - Math.sin(angle) * LABEL_RADIUS
    const isRight = Math.cos(angle) >= 0
    selectedLabelStyle = {
      top: `${Math.max(18, Math.min(CHART_SIZE - 18, y))}px`,
      ...(isRight ? { left: "calc(50% + 64px)" } : { left: "4px" }),
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
      <DashboardBeam />
      <div className="relative z-10 mb-5 flex items-center gap-3">
        <div className="dashboard-3d-icon flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
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
          <div className="relative z-10 mx-auto h-44 w-full max-w-[360px]">
            <div className="absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 [&_.recharts-surface]:outline-none [&_.recharts-surface:focus]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    rootTabIndex={-1}
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={53}
                    outerRadius={74}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                    isAnimationActive={false}
                    onClick={(entry) => handleSliceClick(String(entry.name))}
                  >
                    {data.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-space text-3xl font-bold text-dashboard-text">{conversion}%</span>
                <span className="text-[10px] uppercase tracking-wider text-dashboard-text-muted">aprovados</span>
              </div>
            </div>

            {selectedEntry && (
              <div
                aria-live="polite"
                className="pointer-events-none absolute z-20 w-[112px] -translate-y-1/2 rounded-xl border border-dashboard-border/80 bg-dashboard-surface-elevated/95 px-3 py-2 text-center shadow-lg transition-[left,right,top,opacity,transform] duration-200 ease-out"
                style={selectedLabelStyle}
              >
                <p className="truncate text-xs font-bold text-dashboard-text">{selectedEntry.name}</p>
                <p className="mt-0.5 text-[10px] text-dashboard-text-muted">{selectedEntry.value} ({selectedPercentage}%)</p>
              </div>
            )}
          </div>
          <div className="relative z-10 mt-5 space-y-2.5">
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
