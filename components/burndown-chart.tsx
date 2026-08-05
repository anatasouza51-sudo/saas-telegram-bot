"use client"

import { memo, useMemo, useId } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface BurndownDataPoint {
  day: string
  ideal: number
  actual: number
}

interface BurndownChartProps {
  data: BurndownDataPoint[]
  title?: string
  subtitle?: string
}

const chartConfig = {
  ideal: {
    label: "Ideal",
    color: "rgba(168, 85, 247, 0.5)",
  },
  actual: {
    label: "Real",
    color: "var(--dashboard-accent)",
  },
} satisfies ChartConfig

export const BurndownChart = memo(({
  data,
  title = "Burndown Chart",
  subtitle = "Progresso da Sprint",
}: BurndownChartProps) => {
  const gradientId = useId()

  const formatted = useMemo(() => data.map((d) => ({
    ...d,
    day: d.day,
  })), [data])

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01]">
        <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-dashboard-text-muted mt-1">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--dashboard-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--dashboard-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: "var(--dashboard-text-muted)", fontSize: 10, fontWeight: 600 }}
              />
              <ChartTooltip
                cursor={{ stroke: 'rgba(236, 72, 153, 0.2)', strokeWidth: 2 }}
                content={
                  <ChartTooltipContent
                    className="bg-dashboard-surface-elevated border-dashboard-border shadow-2xl backdrop-blur-md"
                    formatter={(value) => [
                      `${value} pontos`,
                      "",
                    ]}
                  />
                }
              />
              <Legend 
                wrapperStyle={{ paddingTop: "16px" }}
                iconType="line"
              />
              <Line
                dataKey="ideal"
                type="monotone"
                stroke="rgba(168, 85, 247, 0.5)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={true}
                animationDuration={1500}
              />
              <Line
                dataKey="actual"
                type="monotone"
                stroke="var(--dashboard-accent)"
                strokeWidth={3}
                dot={{ fill: "var(--dashboard-accent)", r: 4 }}
                isAnimationActive={true}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})

BurndownChart.displayName = "BurndownChart"
