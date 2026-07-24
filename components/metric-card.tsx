"use client"
import { memo } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react"

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
}

const colorMap = {
  blue: "from-teal-500/10 to-teal-400/3 border-teal-400/15",
  purple: "from-violet-600/10 to-violet-400/3 border-violet-500/15",
  green: "from-emerald-600/10 to-emerald-400/3 border-emerald-500/15",
  red: "from-rose-600/10 to-rose-400/3 border-rose-500/15",
  yellow: "from-amber-500/10 to-amber-400/3 border-amber-500/15",
}

const iconBgMap = {
  blue: "bg-teal-500/15 border-teal-400/25",
  purple: "bg-violet-600/15 border-violet-500/25",
  green: "bg-emerald-600/15 border-emerald-500/25",
  red: "bg-rose-600/15 border-rose-500/25",
  yellow: "bg-amber-500/15 border-amber-500/25",
}

const iconColorMap = {
  blue: "text-teal-300",
  purple: "text-violet-300",
  green: "text-emerald-300",
  red: "text-rose-300",
  yellow: "text-amber-300",
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
}: {
  title: string
  value: string
  iconName?: string
  icon?: LucideIcon
  trend?: "up" | "down"
  trendValue?: string
  color?: "blue" | "purple" | "green" | "red" | "yellow"
  index?: number
}) => {
  const Icon = iconName ? iconMap[iconName] : icon || DollarSign

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className={cn(
        "relative flex flex-col items-center text-center gap-4 sm:flex-row sm:items-center sm:justify-between sm:text-left overflow-hidden rounded-3xl border bg-gradient-to-br min-h-[160px] sm:min-h-[180px] md:min-h-[200px] px-5 sm:px-8 py-8 sm:py-10 shadow-md transition-shadow duration-300",
        colorMap[color]
      )}
    >
      <div className="relative z-10 flex flex-col items-center text-center sm:items-start sm:text-left gap-2 flex-1">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
          {title}
        </p>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: index * 0.08 + 0.08 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight text-white tabular-nums"
        >
          {value}
        </motion.p>

        {trend && trendValue && (
          <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2">
            {trend === "up" ? (
              <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className={cn(
              "text-xs font-black uppercase tracking-wider",
              trend === "up" ? "text-green-400" : "text-red-400"
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </div>

      {/* Ícone circular — centralizado no mobile, à direita a partir de sm */}
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 25, 
          delay: index * 0.08 + 0.15 
        }}
        className={cn(
          "flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 shadow-sm flex-shrink-0 sm:ml-4",
          iconBgMap[color]
        )}
      >
        {Icon && <Icon className={cn("h-10 w-10 sm:h-12 sm:w-12", iconColorMap[color])} />}
      </motion.div>
    </motion.div>
  )
})
MetricCard.displayName = "MetricCard"
