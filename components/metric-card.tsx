import React, { memo, type ReactNode } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  AlertTriangle,
  Zap,
  ShoppingBag,
  type LucideIcon
} from "lucide-react"
import * as Icons from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type MetricColor = "blue" | "green" | "red" | "yellow" | "purple" | "pink" | "indigo"

interface MetricCardProps {
  title: string
  value: string | number
  iconName?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  color?: MetricColor
  index?: number
  className?: string
}

const colorMap: Record<MetricColor, { bg: string; text: string; border: string; glow: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", glow: "shadow-blue-500/[0.06]" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-emerald-500/[0.06]" },
  red: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", glow: "shadow-rose-500/[0.06]" },
  yellow: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", glow: "shadow-amber-500/[0.06]" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", glow: "shadow-purple-500/[0.06]" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20", glow: "shadow-pink-500/[0.06]" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20", glow: "shadow-indigo-500/[0.06]" },
}

const iconMap: Record<string, LucideIcon> = {
  dollar: DollarSign,
  shopping: ShoppingCart,
  users: Users,
  package: Package,
  alert: AlertTriangle,
  zap: Zap,
  check: CheckCircle2,
  clock: Clock,
  x: XCircle,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  bag: ShoppingBag,
  chart: BarChart3,
}

export const MetricCard = memo(({
  title,
  value,
  iconName,
  icon,
  trend,
  trendValue,
  color = "blue",
  index = 0,
  className,
}: MetricCardProps) => {
  const IconComponent = iconName
    ? iconMap[iconName] || (Icons as any)[iconName]
    : icon || DollarSign
  const styles = colorMap[color] || colorMap.blue

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300",
        "hover:border-dashboard-border-active hover:shadow-xl",
        styles.glow,
        className
      )}
    >
      {/* Background Accent Glow */}
      <div className={cn(
        "absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500",
        styles.bg
      )} />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-dashboard-text-muted uppercase tracking-wider">
            {title}
          </span>
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            styles.bg
          )}>
            {IconComponent && <IconComponent className={cn("w-4 h-4", styles.text)} />}
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <h3 className="text-2xl font-black text-dashboard-text tracking-tight tabular-nums">
              {value}
            </h3>

            {trend && trendValue && (
              <div className={cn(
                "flex items-center gap-1 mt-1 text-[10px] font-semibold uppercase tracking-wide",
                trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-dashboard-text-muted"
              )}>
                {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

MetricCard.displayName = "MetricCard"
