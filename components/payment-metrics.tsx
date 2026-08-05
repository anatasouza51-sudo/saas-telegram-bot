"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PaymentMetric {
  label: string
  value: number
  unit?: string
  color: "pink" | "green" | "yellow" | "purple"
}

interface PaymentMetricsProps {
  metrics: PaymentMetric[]
  title?: string
  subtitle?: string
}

const colorClasses = {
  pink: { stroke: "#EC4899", light: "text-pink-400", bg: "from-pink-500/20 to-pink-500/5" },
  green: { stroke: "#34D399", light: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/5" },
  yellow: { stroke: "#FBBF24", light: "text-amber-400", bg: "from-amber-500/20 to-amber-500/5" },
  purple: { stroke: "#A855F7", light: "text-purple-400", bg: "from-purple-500/20 to-purple-500/5" },
}

const CircularProgress = memo(({
  value,
  color,
  size = 100,
}: {
  value: number
  color: "pink" | "green" | "yellow" | "purple"
  size?: number
}) => {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const colors = colorClasses[color]

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="3"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          strokeLinecap="round"
          filter="drop-shadow(0 0 8px rgba(236, 72, 153, 0.3))"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn("text-xl font-black", colors.light)}>
          {value}%
        </span>
      </div>
    </div>
  )
})

CircularProgress.displayName = "CircularProgress"

export const PaymentMetrics = memo(({
  metrics,
  title = "Métricas de Pagamento",
  subtitle = "Taxa de conversão e status",
}: PaymentMetricsProps) => {
  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] backdrop-blur-sm">
        <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-dashboard-text-muted mt-1">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {metrics.map((metric, index) => {
            const colors = colorClasses[metric.color]
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "flex flex-col items-center gap-4 p-4 rounded-2xl backdrop-blur-sm border border-white/10",
                  `bg-gradient-to-br ${colors.bg}`
                )}
              >
                <CircularProgress value={metric.value} color={metric.color} size={100} />
                <div className="text-center">
                  <p className="text-xs font-bold text-dashboard-text">{metric.label}</p>
                  {metric.unit && (
                    <p className="text-[10px] text-dashboard-text-muted mt-1">{metric.unit}</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})

PaymentMetrics.displayName = "PaymentMetrics"
