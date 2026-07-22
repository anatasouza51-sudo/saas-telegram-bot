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
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
}

const colorMap = {
  blue: "from-blue-600/20 to-blue-400/10 border-blue-500/20 shadow-blue-500/5",
  purple: "from-purple-600/20 to-purple-400/10 border-purple-500/20 shadow-purple-500/5",
  green: "from-green-600/20 to-green-400/10 border-green-500/20 shadow-green-500/5",
  red: "from-red-600/20 to-red-400/10 border-red-500/20 shadow-red-500/5",
  yellow: "from-yellow-600/20 to-yellow-400/10 border-yellow-500/20 shadow-yellow-500/5",
}

const iconColorMap = {
  blue: "text-blue-400/30",
  purple: "text-purple-400/30",
  green: "text-green-400/30",
  red: "text-red-400/30",
  yellow: "text-yellow-400/30",
}

const valueColorMap = {
  blue: "text-blue-300",
  purple: "text-purple-300",
  green: "text-green-300",
  red: "text-red-300",
  yellow: "text-yellow-300",
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
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-lg transition-all duration-300",
        colorMap[color]
      )}
    >
      {/* Ícone de fundo com animação suave */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.25 }}
        transition={{ delay: index * 0.1 + 0.2 }}
        className="absolute top-2 right-2"
      >
        {Icon && <Icon className={cn("h-10 w-10 sm:h-12 sm:w-12", iconColorMap[color])} />}
      </motion.div>

      <div className="relative z-10 flex flex-col">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 pr-10 truncate">
          {title}
        </p>
        
        <motion.p 
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.1 }}
          className={cn("text-2xl sm:text-3xl font-black leading-tight truncate", valueColorMap[color])}
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
              "text-xs font-bold",
              trend === "up" ? "text-green-400" : "text-red-400"
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
      
      {/* Overlay de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 transition-opacity duration-500 hover:opacity-100 pointer-events-none" />
    </motion.div>
  )
})
MetricCard.displayName = "MetricCard"
