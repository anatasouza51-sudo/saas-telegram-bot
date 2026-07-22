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
  blue: "from-blue-600/10 to-blue-400/5 border-blue-500/10 shadow-blue-500/5",
  purple: "from-purple-600/10 to-purple-400/5 border-purple-500/10 shadow-purple-500/5",
  green: "from-green-600/10 to-green-400/5 border-green-500/10 shadow-green-500/5",
  red: "from-red-600/10 to-red-400/5 border-red-500/10 shadow-red-500/5",
  yellow: "from-yellow-600/10 to-yellow-400/5 border-yellow-500/10 shadow-yellow-500/5",
}

const iconBgMap = {
  blue: "bg-blue-600/20 border-blue-500/30",
  purple: "bg-purple-600/20 border-purple-500/30",
  green: "bg-green-600/20 border-green-500/30",
  red: "bg-red-600/20 border-red-500/30",
  yellow: "bg-yellow-600/20 border-yellow-500/30",
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
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={cn(
        "relative flex items-center justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-xl transition-all duration-300 backdrop-blur-md",
        colorMap[color]
      )}
    >
      <div className="relative z-10 flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground/80">
          {title}
        </p>
        
        <motion.p 
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.1 }}
          className="text-2xl sm:text-3xl font-black leading-tight text-white"
        >
          {value}
        </motion.p>

        {trend && trendValue && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3 text-green-400 shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
            )}
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider",
              trend === "up" ? "text-green-400" : "text-red-400"
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </div>

      {/* Ícone circular à direita conforme a imagem */}
      <motion.div 
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20, 
          delay: index * 0.1 + 0.2 
        }}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-lg",
          iconBgMap[color]
        )}
      >
        {Icon && <Icon className={cn("h-7 w-7", iconColorMap[color])} />}
      </motion.div>
      
      {/* Background decoration - ícone gigante fosco */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
        {Icon && <Icon className={cn("h-24 w-24", iconColorMap[color])} />}
      </div>
    </motion.div>
  )
})
MetricCard.displayName = "MetricCard"
