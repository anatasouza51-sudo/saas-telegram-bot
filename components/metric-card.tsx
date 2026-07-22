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
  blue: "from-blue-600/8 to-blue-400/3 border-blue-500/15",
  purple: "from-purple-600/8 to-purple-400/3 border-purple-500/15",
  green: "from-green-600/8 to-green-400/3 border-green-500/15",
  red: "from-red-600/8 to-red-400/3 border-red-500/15",
  yellow: "from-yellow-600/8 to-yellow-400/3 border-yellow-500/15",
}

const iconBgMap = {
  blue: "bg-blue-600/15 border-blue-500/25",
  purple: "bg-purple-600/15 border-purple-500/25",
  green: "bg-green-600/15 border-green-500/25",
  red: "bg-red-600/15 border-red-500/25",
  yellow: "bg-yellow-600/15 border-yellow-500/25",
}

const iconColorMap = {
  blue: "text-blue-400",
  purple: "text-purple-400",
  green: "text-green-400",
  red: "text-red-400",
  yellow: "text-yellow-400",
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
        "relative flex items-center justify-between overflow-hidden rounded-3xl border bg-gradient-to-br min-h-[160px] sm:min-h-[180px] md:min-h-[200px] px-6 sm:px-8 py-8 sm:py-10 shadow-md transition-shadow duration-300",
        colorMap[color]
      )}
    >
      <div className="relative z-10 flex flex-col gap-2 flex-1">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
          {title}
        </p>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: index * 0.08 + 0.08 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight text-white"
        >
          {value}
        </motion.p>

        {trend && trendValue && (
          <div className="flex items-center gap-1.5 mt-2">
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

      {/* Ícone circular à direita */}
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
          "flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 shadow-sm flex-shrink-0 ml-4",
          iconBgMap[color]
        )}
      >
        {Icon && <Icon className={cn("h-10 w-10 sm:h-12 sm:w-12", iconColorMap[color])} />}
      </motion.div>
    </motion.div>
  )
})
MetricCard.displayName = "MetricCard"
