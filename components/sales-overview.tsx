import { memo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SalesMetric {
  label: string
  value: string | number
  icon: React.ReactNode
  color: "pink" | "green" | "yellow" | "purple"
}

interface SalesOverviewProps {
  metrics: SalesMetric[]
}

const colorClasses = {
  pink: {
    bg: "from-pink-500/[0.07] to-transparent",
    border: "border-pink-500/20",
    iconBg: "bg-pink-500/10",
    iconText: "text-pink-400",
    glow: "shadow-pink-500/[0.06]",
    borderHover: "hover:border-pink-500/40",
  },
  green: {
    bg: "from-emerald-500/[0.07] to-transparent",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-400",
    glow: "shadow-emerald-500/[0.06]",
    borderHover: "hover:border-emerald-500/40",
  },
  yellow: {
    bg: "from-amber-500/[0.07] to-transparent",
    border: "border-amber-500/20",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
    glow: "shadow-amber-500/[0.06]",
    borderHover: "hover:border-amber-500/40",
  },
  purple: {
    bg: "from-purple-500/[0.07] to-transparent",
    border: "border-purple-500/20",
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-400",
    glow: "shadow-purple-500/[0.06]",
    borderHover: "hover:border-purple-500/40",
  },
}

export const SalesOverview = memo(({ metrics }: SalesOverviewProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const colors = colorClasses[metric.color]
        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-dashboard-surface p-5 transition-all duration-300",
              colors.border,
              colors.borderHover,
              colors.glow,
              "hover:shadow-xl"
            )}
          >
            {/* Ambient glow */}
            <div className={cn(
              "absolute -right-6 -top-6 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700",
              colors.bg
            )} />

            <div className="relative flex items-start justify-between mb-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                colors.iconBg
              )}>
                <div className={cn("flex items-center justify-center w-5 h-5", colors.iconText)}>
                  {metric.icon}
                </div>
              </div>
            </div>

            <div className="relative space-y-1">
              <p className="text-[11px] font-semibold text-dashboard-text-muted uppercase tracking-wider">
                {metric.label}
              </p>
              <h3 className="text-2xl font-black text-dashboard-text tracking-tight tabular-nums">
                {metric.value}
              </h3>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
})

SalesOverview.displayName = "SalesOverview"
