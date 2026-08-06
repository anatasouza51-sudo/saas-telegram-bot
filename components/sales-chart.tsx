import { memo, useMemo, useId } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { TrendingUp } from "lucide-react"
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

export const SalesChart = memo(({ data }: { data: SalesPoint[] }) => {
  const gradientId = useId()

  const formatted = useMemo(() => data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  })), [data])

  const totalRevenue = useMemo(() => data.reduce((sum, d) => sum + d.revenue, 0), [data])
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300 hover:border-dashboard-border-active">
      {/* Ambient glow */}
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-pink-500/[0.06] to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-pink-400" />
            </div>
            <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
              Receita
            </h3>
          </div>
          <p className="text-xs text-dashboard-text-muted ml-10">Evolução nos últimos 30 dias</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-dashboard-text tabular-nums">
            {fullCurrency.format(totalRevenue)}
          </p>
          <p className="text-[10px] text-dashboard-text-muted uppercase tracking-wider">
            Média {compactCurrency.format(avgRevenue)}/dia
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-[260px] sm:h-[300px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dashboard-accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--dashboard-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.025)" strokeDasharray="0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                minTickGap={20}
                tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) => compactCurrency.format(v as number)}
                tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }}
              />
              <ChartTooltip
                cursor={{ stroke: 'rgba(236, 72, 153, 0.3)', strokeWidth: 1.5 }}
                content={
                  <ChartTooltipContent
                    className="bg-dashboard-surface-elevated border border-dashboard-border shadow-2xl backdrop-blur-xl rounded-xl"
                    labelFormatter={(v) => `Dia ${v}`}
                    formatter={(value) => [
                      fullCurrency.format(value as number),
                      " Receita",
                    ]}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill={`url(#${gradientId})`}
                stroke="var(--dashboard-accent)"
                strokeWidth={2.5}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
})
SalesChart.displayName = "SalesChart"
