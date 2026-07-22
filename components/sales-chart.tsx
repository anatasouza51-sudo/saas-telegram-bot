"use client"

import { memo, useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
    color: "#8b5cf6",
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
  const formatted = useMemo(() => data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  })), [data])

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <AreaChart data={formatted} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeOpacity={0.1} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => compactCurrency.format(v as number)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
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
          fill="url(#fillRevenue)"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          isAnimationActive={true}
          animationDuration={1500}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ChartContainer>
  )
})
SalesChart.displayName = "SalesChart"
