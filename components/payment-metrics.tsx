"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Percent } from "lucide-react"

interface PaymentMetric {
  label: string
  value: number
  unit?: string
  color: "blue" | "emerald" | "amber" | "rose"
}

interface PaymentMetricsProps {
  metrics: PaymentMetric[]
  title?: string
  subtitle?: string
}

const colorClasses = {
  blue: { stroke: "#60A5FA", light: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-400/20" },
  emerald: { stroke: "#34D399", light: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-400/20" },
  amber: { stroke: "#FBBF24", light: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-400/20" },
  rose: { stroke: "#FB7185", light: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-400/20" },
}

const CircularProgress = memo(({ value, color, size = 82 }: { value: number; color: PaymentMetric["color"]; size?: number }) => {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference
  const colors = colorClasses[color]

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.stroke} strokeWidth="3" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 0.9, ease: "easeInOut" }} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center"><span className={cn("font-space text-lg font-bold", colors.light)}>{value}%</span></div>
    </div>
  )
})

CircularProgress.displayName = "CircularProgress"

export const PaymentMetrics = memo(({ metrics, title = "Saúde dos pagamentos", subtitle = "Acompanhe aprovação, pendências e recusas" }: PaymentMetricsProps) => {
  return (
    <section className="rounded-[22px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10"><Percent className="h-4 w-4 text-violet-400" /></div>
        <div><h3 className="text-sm font-bold text-dashboard-text">{title}</h3><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">{subtitle}</p></div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metrics.map((metric) => {
          const colors = colorClasses[metric.color]
          return (
            <div key={metric.label} className="flex items-center gap-4 rounded-2xl border border-dashboard-border/70 bg-dashboard-bg/45 p-3.5 sm:flex-col sm:justify-center sm:gap-2 sm:p-4">
              <CircularProgress value={metric.value} color={metric.color} />
              <div className="min-w-0 sm:text-center"><p className="text-xs font-bold text-dashboard-text">{metric.label}</p>{metric.unit && <p className={cn("mt-1 truncate text-[10px]", colors.light)}>{metric.unit}</p>}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
})

PaymentMetrics.displayName = "PaymentMetrics"
