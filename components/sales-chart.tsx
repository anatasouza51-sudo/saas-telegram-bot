"use client"

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
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function SalesChart({ data }: { data: SalesPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <AreaChart data={formatted} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeOpacity={0.15} />
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
          tickFormatter={(v) =>
            new Intl.NumberFormat("pt-BR", {
              notation: "compact",
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 1,
            }).format(v as number)
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => `Dia ${v}`}
              formatter={(value) => [
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(value as number),
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
        />
      </AreaChart>
    </ChartContainer>
  )
}
