"use client"

import { memo, useId, useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Activity } from "lucide-react"
import type { SalesPoint } from "@/lib/queries/dashboard"

const chartConfig = {
  revenue: {
    label: "Receita",
    color: "var(--dashboard-accent)",
  },
} satisfies ChartConfig

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 1,
})

const fullCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export const SalesChart = memo(({ data, periodLabel }: { data: SalesPoint[]; periodLabel: string }) => {
  const gradientId = useId()
  const formatted = useMemo(
    () => data.map((d) => ({
      ...d,
      label: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    })),
    [data],
  )
  const totalRevenue = useMemo(() => data.reduce((sum, d) => sum + d.revenue, 0), [data])
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0

  return (
    <section className="group relative overflow-hidden rounded-[22px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10">
              <Activity className="size-4 shrink-0 text-blue-400" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-dashboard-text">Seu desempenho</h3>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">{periodLabel}</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-dashboard-text-muted">
            <span className="h-2 w-2 rounded-full bg-dashboard-accent" />
            <span>Receita</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-space text-xl font-bold tabular-nums text-dashboard-text">{fullCurrency.format(totalRevenue)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-dashboard-text-muted">média {compactCurrency.format(avgRevenue)}/dia</p>
        </div>
      </div>

      <div className="relative h-[250px] sm:h-[285px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dashboard-accent)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--dashboard-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} minTickGap={20} tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => compactCurrency.format(v as number)} tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }} />
              <ChartTooltip
                cursor={{ stroke: "rgba(59, 130, 246, 0.35)", strokeWidth: 1.5 }}
                content={
                  <ChartTooltipContent
                    className="rounded-xl border border-dashboard-border bg-dashboard-surface-elevated shadow-xl"
                    labelFormatter={(v) => `Dia ${v}`}
                    formatter={(value) => [fullCurrency.format(value as number), " Receita"]}
                  />
                }
              />
              <Area dataKey="revenue" type="monotone" fill={`url(#${gradientId})`} stroke="var(--dashboard-accent)" strokeWidth={2.5} isAnimationActive animationDuration={900} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </section>
  )
})

SalesChart.displayName = "SalesChart"
