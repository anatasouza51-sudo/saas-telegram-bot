"use client"

import { memo, useMemo, useId } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { SalesPoint } from "@/lib/queries/dashboard"

const chartConfig = {
  revenue: {
    label: "Receita",
    color: "var(--dashboard-accent)",
  },
} satisfies ChartConfig

// Memoized formatters to avoid recreation on each render
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 1,
});

const fullCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const SalesChart = memo(({ data }: { data: SalesPoint[] }) => {
  const gradientId = useId()
  
  const formatted = useMemo(() => data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  })), [data])

  return (
    <ChartContainer config={chartConfig} className="h-[280px] sm:h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--dashboard-accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--dashboard-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            minTickGap={16}
            tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => compactCurrency.format(v as number)}
            tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }}
          />
          <ChartTooltip
            cursor={{ stroke: 'rgba(236, 72, 153, 0.2)', strokeWidth: 2 }}
            content={
              <ChartTooltipContent
                className="bg-dashboard-surface-elevated border-dashboard-border shadow-2xl backdrop-blur-md"
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
            strokeWidth={3}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
})
SalesChart.displayName = "SalesChart"
