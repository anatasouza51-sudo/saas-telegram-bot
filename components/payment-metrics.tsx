import { memo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Percent } from "lucide-react"

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
  pink: { stroke: "#EC4899", light: "text-pink-400", bg: "bg-pink-500/10", glow: "shadow-pink-500/[0.06]" },
  green: { stroke: "#34D399", light: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/[0.06]" },
  yellow: { stroke: "#FBBF24", light: "text-amber-400", bg: "bg-amber-500/10", glow: "shadow-amber-500/[0.06]" },
  purple: { stroke: "#A855F7", light: "text-purple-400", bg: "bg-purple-500/10", glow: "shadow-purple-500/[0.06]" },
}

const CircularProgress = memo(({
  value,
  color,
  size = 88,
}: {
  value: number
  color: "pink" | "green" | "yellow" | "purple"
  size?: number
}) => {
  const radius = (size - 10) / 2
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
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="2.5"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn("text-lg font-black", colors.light)}>
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
    <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300 hover:border-dashboard-border-active">
      {/* Ambient glow */}
      <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-gradient-to-br from-purple-500/[0.05] to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Percent className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-dashboard-text-muted">{subtitle}</p>
        </div>
      </div>

      <div className="relative grid grid-cols-2 md:grid-cols-3 gap-5">
        {metrics.map((metric, index) => {
          const colors = colorClasses[metric.color]
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
            >
              <CircularProgress value={metric.value} color={metric.color} size={88} />
              <div className="text-center space-y-0.5">
                <p className="text-xs font-bold text-dashboard-text">{metric.label}</p>
                {metric.unit && (
                  <p className="text-[10px] text-dashboard-text-muted">{metric.unit}</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
})

PaymentMetrics.displayName = "PaymentMetrics"
